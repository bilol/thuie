import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../entities';
import { DepartmentsService } from './services/departments.service';
import { DepartmentsController } from './controllers/departments.controller';

/** §6.3 departments registry. */
@Module({
  imports: [TypeOrmModule.forFeature([Department])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
