import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Chat, ChatType } from './entities/chat.entity';
import { ChatMessage, MessageType } from './entities/chat-message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { User } from '../users/entities/user.entity';

export interface CreateChatDto {
  name?: string;
  type: ChatType;
  participantIds: number[];
  isPrivate?: boolean;
  description?: string;
  metadata?: any;
}

export interface SendMessageDto {
  chatId: string;
  senderId: number;
  content: string;
  type?: MessageType;
  metadata?: any;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatParticipant)
    private participantRepository: Repository<ChatParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createChat(createChatDto: CreateChatDto, creatorId: number): Promise<Chat> {
    try {
      this.logger.log(`Création d'un chat ${createChatDto.type} par l'utilisateur ${creatorId}`);

      // Vérifier que tous les participants existent
      const participants = await this.userRepository.find({
        where: { id: In([...createChatDto.participantIds, creatorId]) },
      });

      if (participants.length !== createChatDto.participantIds.length + 1) {
        throw new BadRequestException('Certains participants n\'existent pas');
      }

      // Pour les chats directs, vérifier qu'il n'y a que 2 participants
      if (createChatDto.type === 'DIRECT' && createChatDto.participantIds.length !== 1) {
        throw new BadRequestException('Un chat direct ne peut avoir que 2 participants');
      }

      // Vérifier si un chat direct existe déjà entre ces utilisateurs
      if (createChatDto.type === 'DIRECT') {
        const existingChat = await this.findDirectChatBetweenUsers(creatorId, createChatDto.participantIds[0]);
        if (existingChat) {
          return existingChat;
        }
      } 

      // Créer le chat
      const chat = this.chatRepository.create({
        name: createChatDto.name || this.generateChatName(createChatDto, participants),
        type: createChatDto.type,
        isPrivate: createChatDto.isPrivate || false,
        description: createChatDto.description,
        createdBy: creatorId,
        metadata: createChatDto.metadata,
        lastActivity: new Date(),
      });

      const savedChat = await this.chatRepository.save(chat);

      // Ajouter tous les participants
      const allParticipantIds = [...createChatDto.participantIds, creatorId];
      await this.addParticipants(savedChat.id, allParticipantIds, creatorId);

      // Message système de création
      await this.sendSystemMessage(savedChat.id, `Chat "${savedChat.name}" créé`);

      this.logger.log(`Chat créé: ${savedChat.id} avec ${allParticipantIds.length} participants`);
      return savedChat;

    } catch (error) {
      this.logger.error(`Erreur création chat: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendMessage(sendMessageDto: SendMessageDto): Promise<ChatMessage> {
    try {
      // Vérifier que le chat existe et que l'utilisateur est participant
      const chat = await this.chatRepository.findOne({
        where: { id: sendMessageDto.chatId },
      });

      if (!chat) {
        throw new NotFoundException('Chat non trouvé');
      }

      const isParticipant = await this.participantRepository.findOne({
        where: {
          chatId: sendMessageDto.chatId,
          userId: sendMessageDto.senderId,
          isActive: true,
        },
      });

      if (!isParticipant) {
        throw new BadRequestException('Utilisateur non autorisé à envoyer des messages dans ce chat');
      }

      // Créer le message
      const message = this.messageRepository.create({
        chatId: sendMessageDto.chatId,
        senderId: sendMessageDto.senderId,
        content: sendMessageDto.content,
        type: sendMessageDto.type || MessageType.TEXT,
        metadata: sendMessageDto.metadata,
      });

      const savedMessage = await this.messageRepository.save(message);

      // Mettre à jour l'activité du chat
      await this.chatRepository.update(sendMessageDto.chatId, {
        lastActivity: new Date(),
        lastMessageId: savedMessage.id,
      });

      // Marquer le message comme lu par l'expéditeur
      await this.markMessageAsRead(savedMessage.id, sendMessageDto.senderId);

      this.logger.debug(`Message envoyé dans ${sendMessageDto.chatId} par ${sendMessageDto.senderId}`);
      return savedMessage;

    } catch (error) {
      this.logger.error(`Erreur envoi message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getChatMessages(
    chatId: string,
    userId: number,
    options: {
      page?: number;
      limit?: number;
      beforeMessageId?: number;
    } = {}
  ): Promise<{ messages: ChatMessage[], hasMore: boolean }> {
    try {
      // Vérifier que l'utilisateur est participant
      const isParticipant = await this.isUserParticipant(chatId, userId);
      if (!isParticipant) {
        throw new BadRequestException('Accès non autorisé à ce chat');
      }

      const { page = 1, limit = 50, beforeMessageId } = options;

      const queryBuilder = this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.chatId = :chatId', { chatId })
        .orderBy('message.createdAt', 'DESC')
        .limit(limit);

      if (beforeMessageId) {
        queryBuilder.andWhere('message.id < :beforeMessageId', { beforeMessageId });
      } else {
        queryBuilder.offset((page - 1) * limit);
      }

      const messages = await queryBuilder.getMany();
      
      // Vérifier s'il y a plus de messages
      const hasMore = messages.length === limit;

      // Inverser l'ordre pour avoir les messages du plus ancien au plus récent
      messages.reverse();

      return { messages, hasMore };

    } catch (error) {
      this.logger.error(`Erreur récupération messages: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserChats(
    userId: number,
    options: {
      type?: string;
      includeArchived?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ chats: Chat[], total: number }> {
    try {
      const { type, includeArchived = false, page = 1, limit = 20 } = options;

      const queryBuilder = this.chatRepository
        .createQueryBuilder('chat')
        .leftJoinAndSelect('chat.participants', 'participants')
        .leftJoinAndSelect('participants.user', 'user')
        .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
        .leftJoinAndSelect('lastMessage.sender', 'lastMessageSender')
        .where('participants.userId = :userId', { userId })
        .andWhere('participants.isActive = :isActive', { isActive: true });

      if (type) {
        queryBuilder.andWhere('chat.type = :type', { type });
      }

      if (!includeArchived) {
        queryBuilder.andWhere('participants.isArchived = :isArchived', { isArchived: false });
      }

      queryBuilder
        .orderBy('chat.lastActivity', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      const [chats, total] = await queryBuilder.getManyAndCount();

      return { chats, total };

    } catch (error) {
      this.logger.error(`Erreur récupération chats utilisateur: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addParticipants(chatId: string, userIds: number[], addedBy: number): Promise<void> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
      });

      if (!chat) {
        throw new NotFoundException('Chat non trouvé');
      }

      // Vérifier que celui qui ajoute est bien participant ou créateur
      const canAdd = await this.canUserModifyChat(chatId, addedBy);
      if (!canAdd) {
        throw new BadRequestException('Non autorisé à ajouter des participants');
      }

      // Vérifier que les utilisateurs existent
      const users = await this.userRepository.find({
        where: { id: In(userIds) },
      });

      if (users.length !== userIds.length) {
        throw new BadRequestException('Certains utilisateurs n\'existent pas');
      }

      // Ajouter les participants
      const participants = userIds.map(userId => 
        this.participantRepository.create({
          chatId,
          userId,
          addedBy,
          joinedAt: new Date(),
          isActive: true,
          isArchived: false,
        })
      );

      await this.participantRepository.save(participants);

      // Message système
      const userNames = users.map(u => u.username).join(', ');
      await this.sendSystemMessage(chatId, `${userNames} ajouté(s) au chat`);

      this.logger.log(`${userIds.length} participants ajoutés au chat ${chatId}`);

    } catch (error) {
      this.logger.error(`Erreur ajout participants: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeParticipant(chatId: string, userId: number, removedBy: number): Promise<void> {
    try {
      // Vérifier les permissions
      const canRemove = await this.canUserModifyChat(chatId, removedBy);
      if (!canRemove && removedBy !== userId) { // Un utilisateur peut toujours se retirer
        throw new BadRequestException('Non autorisé à retirer des participants');
      }

      // Marquer comme inactif au lieu de supprimer
      await this.participantRepository.update(
        { chatId, userId },
        { isActive: false, leftAt: new Date() }
      );

      // Message système
      const user = await this.userRepository.findOne({ where: { id: userId } });
      await this.sendSystemMessage(chatId, `${user?.username || userId} a quitté le chat`);

      this.logger.log(`Participant ${userId} retiré du chat ${chatId}`);

    } catch (error) {
      this.logger.error(`Erreur retrait participant: ${error.message}`, error.stack);
      throw error;
    }
  }

  async markMessageAsRead(messageId: number, userId: number): Promise<void> {
    try {
      // Cette fonction pourrait être étendue avec une table de lecture des messages
      // Pour l'instant, on log juste l'action
      this.logger.debug(`Message ${messageId} marqué comme lu par ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur marquage lecture: ${error.message}`, error.stack);
    }
  }

  async archiveChat(chatId: string, userId: number): Promise<void> {
    try {
      await this.participantRepository.update(
        { chatId, userId },
        { isArchived: true }
      );

      this.logger.log(`Chat ${chatId} archivé pour l'utilisateur ${userId}`);
    } catch (error) {
      this.logger.error(`Erreur archivage chat: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteChat(chatId: string, userId: number): Promise<void> {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
      });

      if (!chat) {
        throw new NotFoundException('Chat non trouvé');
      }

      // Seul le créateur peut supprimer le chat
      if (chat.createdBy !== userId) {
        throw new BadRequestException('Non autorisé à supprimer ce chat');
      }

      // Marquer tous les participants comme inactifs
      await this.participantRepository.update(
        { chatId },
        { isActive: false, leftAt: new Date() }
      );

      // Soft delete du chat
      await this.chatRepository.update(chatId, { isDeleted: true });

      this.logger.log(`Chat ${chatId} supprimé par ${userId}`);

    } catch (error) {
      this.logger.error(`Erreur suppression chat: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private async findDirectChatBetweenUsers(user1Id: number, user2Id: number): Promise<Chat | null> {
    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.participants', 'p1')
      .leftJoin('chat.participants', 'p2')
      .where('chat.type = :type', { type: 'DIRECT' })
      .andWhere('p1.userId = :user1Id', { user1Id })
      .andWhere('p2.userId = :user2Id', { user2Id })
      .andWhere('p1.isActive = true')
      .andWhere('p2.isActive = true')
      .getOne();

    return chat;
  }

  private generateChatName(createChatDto: CreateChatDto, participants: User[]): string {
    switch (createChatDto.type) {
      case 'DIRECT':
        return participants.map(p => p.username).join(', ');
      case 'GROUP':
        return createChatDto.name || `Groupe ${participants.length} membres`;
      case 'CLASS':
        return createChatDto.name || 'Chat de classe';
      case 'COURSE':
        return createChatDto.name || 'Chat de cours';
      default:
        return 'Nouveau chat';
    }
  }

  private async sendSystemMessage(chatId: string, content: string): Promise<ChatMessage> {
    const systemMessage = this.messageRepository.create({
      chatId,
      senderId: null, // Message système
      content,
      type: MessageType.SYSTEM,
    });

    return await this.messageRepository.save(systemMessage);
  }

  private async isUserParticipant(chatId: string, userId: number): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: {
        chatId,
        userId,
        isActive: true,
      },
    });

    return !!participant;
  }

  private async canUserModifyChat(chatId: string, userId: number): Promise<boolean> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
    });

    if (!chat) return false;

    // Le créateur peut toujours modifier
    if (chat.createdBy === userId) return true;

    // Pour les chats de groupe, tous les participants peuvent ajouter
    if (chat.type === 'GROUP') {
      return await this.isUserParticipant(chatId, userId);
    }

    return false;
  }

  // ==================== STATISTIQUES ====================

  async getChatStats(chatId?: string) {
    try {
      const baseWhere = chatId ? { chatId } : {};

      const [totalMessages, totalChats, activeChats] = await Promise.all([
        this.messageRepository.count({ where: baseWhere }),
        chatId ? 1 : this.chatRepository.count({ where: { isDeleted: false } }),
        chatId ? 1 : this.chatRepository.count({ 
          where: { 
            isDeleted: false,
            lastActivity: In(this.getRecentDates(7)) // Actif dans les 7 derniers jours
          } 
        }),
      ]);

      const messagesByType = await this.getMessagesByType(chatId);

      return {
        totalMessages,
        totalChats,
        activeChats,
        messagesByType,
      };

    } catch (error) {
      this.logger.error(`Erreur statistiques chat: ${error.message}`, error.stack);
      return null;
    }
  }

  private async getMessagesByType(chatId?: string) {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .select('message.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('message.type');

    if (chatId) {
      query.where('message.chatId = :chatId', { chatId });
    }

    const result = await query.getRawMany();
    return result.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});
  }

  private getRecentDates(days: number): Date[] {
    const dates: Date[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    return dates;
  }
}