import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AlumniProfile, CampusEvent, Department, FacultyMember, ForumPost, InfoPost, ProfileSkill, Tag, User,
} from '../entities';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';

/** §6.14 cross-resource search + autocomplete over the searchable registries. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      InfoPost, ForumPost, AlumniProfile, CampusEvent, FacultyMember, Tag, ProfileSkill, Department, User,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
