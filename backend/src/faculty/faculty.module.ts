import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department, FacultyMember } from '../entities';
import { FacultyService } from './services/faculty.service';
import { FacultyAdminController, FacultyController } from './controllers/faculty.controller';

/** §6.6 faculty directory (public browse + admin CRUD). */
@Module({
  imports: [TypeOrmModule.forFeature([FacultyMember, Department])],
  controllers: [FacultyController, FacultyAdminController],
  providers: [FacultyService],
  exports: [FacultyService],
})
export class FacultyModule {}
