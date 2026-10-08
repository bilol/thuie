import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities';

/** §6.3 departments — the (single, IE) school registry, read-only from the API. */
@Injectable()
export class DepartmentsService {
  constructor(@InjectRepository(Department) private readonly repo: Repository<Department>) {}

  list(): Promise<Department[]> {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  findByCodeOrId(value: string): Promise<Department | null> {
    return /^\d+$/.test(value)
      ? this.repo.findOne({ where: { id: value } })
      : this.repo.findOne({ where: { code: value } });
  }
}
