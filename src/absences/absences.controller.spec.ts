import { Test, TestingModule } from '@nestjs/testing';
import { AbsencesController } from './absences.controller';
import { AbsencesService } from './absences.service';

describe('AbsencesController', () => {
  let controller: AbsencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AbsencesController],
      providers: [AbsencesService],
    }).compile();

    controller = module.get<AbsencesController>(AbsencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
