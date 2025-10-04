import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedSocket } from './realtime.gateway';

export interface UserPresence {
  userId: number;
  username: string;
  email: string;
  role: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  lastSeen: Date;
  socketId: string;
  connectedAt: Date;
} 

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private connectedUsers = new Map<number, UserPresence>();
  private socketToUser = new Map<string, number>();

  constructor() {
    // Nettoyage périodique des présences obsolètes
    setInterval(() => {
      this.cleanupStalePresences();
    }, 60000); // Chaque minute
  }

  async userConnected(socket: AuthenticatedSocket) {
    if (!socket.user) return;
    
    const user = socket.user; // Store reference to avoid TypeScript issues

    const presence: UserPresence = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: 'available',
      lastSeen: new Date(),
      socketId: socket.id,
      connectedAt: new Date(),
    };

    this.connectedUsers.set(user.id, presence);
    this.socketToUser.set(socket.id, user.id);

    this.logger.log(`👤 ${user.username} maintenant en ligne`);

    // Notifier les autres utilisateurs
    socket.broadcast.emit('user_online', {
      userId: user.id,
      username: user.username,
      role: user.role,
      status: 'available',
      connectedAt: presence.connectedAt,
    });

    // Envoyer la liste des utilisateurs en ligne au nouveau connecté
    const onlineUsers = Array.from(this.connectedUsers.values())
      .filter(userPresence => userPresence.userId !== user.id)
      .map(user => ({
        userId: user.userId,
        username: user.username,
        role: user.role,
        status: user.status,
        lastSeen: user.lastSeen,
      }));

    socket.emit('online_users_list', onlineUsers);
  }

  async userDisconnected(socket: AuthenticatedSocket) {
    if (!socket.user) return;
    
    const user = socket.user; // Store reference to avoid TypeScript issues
    const userId = user.id;
    const presence = this.connectedUsers.get(userId);

    if (presence) {
      // Marquer comme hors ligne mais garder l'information quelques minutes
      presence.status = 'offline';
      presence.lastSeen = new Date();
      
      this.socketToUser.delete(socket.id);

      this.logger.log(`👤 ${user.username} maintenant hors ligne`);

      // Notifier les autres utilisateurs
      socket.broadcast.emit('user_offline', {
        userId: user.id,
        username: user.username,
        lastSeen: presence.lastSeen,
      });

      // Supprimer après 5 minutes
      setTimeout(() => {
        this.connectedUsers.delete(userId);
      }, 5 * 60 * 1000);
    }
  }

  async updateUserStatus(userId: number, status: 'available' | 'busy' | 'away') {
    const presence = this.connectedUsers.get(userId);
    if (!presence) return;

    const oldStatus = presence.status;
    presence.status = status;
    presence.lastSeen = new Date();

    this.logger.log(`👤 ${presence.username} statut: ${oldStatus} → ${status}`);

    // Notifier les autres utilisateurs via le gateway
    // (sera géré par le gateway qui appelle cette méthode)
  }

  async getOnlineUsers(): Promise<UserPresence[]> {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.status !== 'offline')
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async getUserPresence(userId: number): Promise<UserPresence | null> {
    return this.connectedUsers.get(userId) || null;
  }

  async getOnlineUsersByRole(role: string): Promise<UserPresence[]> {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.role === role && user.status !== 'offline')
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async isUserOnline(userId: number): Promise<boolean> {
    const presence = this.connectedUsers.get(userId);
    return presence ? presence.status !== 'offline' : false;
  }

  async getPresenceStats() {
    const presences = Array.from(this.connectedUsers.values());
    
    const stats = {
      totalOnline: presences.filter(p => p.status !== 'offline').length,
      totalConnected: presences.length,
      byStatus: {
        available: presences.filter(p => p.status === 'available').length,
        busy: presences.filter(p => p.status === 'busy').length,
        away: presences.filter(p => p.status === 'away').length,
        offline: presences.filter(p => p.status === 'offline').length,
      },
      byRole: {},
    };

    // Statistiques par rôle
    presences.forEach(presence => {
      if (!stats.byRole[presence.role]) {
        stats.byRole[presence.role] = {
          total: 0,
          available: 0,
          busy: 0,
          away: 0,
          offline: 0,
        };
      }
      stats.byRole[presence.role].total++;
      stats.byRole[presence.role][presence.status]++;
    });

    return stats;
  }

  async updateUserActivity(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    const presence = this.connectedUsers.get(userId);
    if (presence) {
      presence.lastSeen = new Date();
    }
  }

  private cleanupStalePresences() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [userId, presence] of this.connectedUsers.entries()) {
      if (presence.status === 'offline' && 
          (now.getTime() - presence.lastSeen.getTime()) > timeout) {
        this.connectedUsers.delete(userId);
        this.logger.debug(`🧹 Nettoyage présence obsolète: ${presence.username}`);
      }
    }
  }

  // ==================== MÉTHODES DE GESTION DES GROUPES ====================

  async getUsersInGroup(groupType: 'role' | 'course' | 'class', groupId: string): Promise<UserPresence[]> {
    // Cette méthode pourrait être étendue pour gérer les groupes spécifiques
    // comme les étudiants d'un cours, d'une classe, etc.
    
    const allUsers = Array.from(this.connectedUsers.values());
    
    switch (groupType) {
      case 'role':
        return allUsers.filter(user => user.role === groupId && user.status !== 'offline');
      
      // case 'course':
      //   // Logique pour récupérer les utilisateurs d'un cours spécifique
      //   break;
      
      // case 'class':
      //   // Logique pour récupérer les utilisateurs d'une classe spécifique
      //   break;
      
      default:
        return [];
    }
  }

  async broadcastToOnlineAdmins(event: string, data: any, server: any) {
    const adminIds = Array.from(this.connectedUsers.values())
      .filter(user => user.role === 'ADMIN' && user.status !== 'offline')
      .map(user => user.userId);

    adminIds.forEach(adminId => {
      server.to(`user_${adminId}`).emit(event, data);
    });
  }

  async notifyUserActivity(userId: number, activity: {
    type: 'page_view' | 'action' | 'interaction';
    details: any;
  }) {
    const presence = this.connectedUsers.get(userId);
    if (!presence) return;

    presence.lastSeen = new Date();
    
    this.logger.debug(`📊 Activité utilisateur ${presence.username}: ${activity.type}`);
    
    // Ici on pourrait enregistrer l'activité en base de données
    // pour des analytics plus poussées
  }
}