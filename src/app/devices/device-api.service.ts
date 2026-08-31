import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Device, DeviceStatusMap } from '../../../shared/api-types';

@Injectable({ providedIn: 'root' })
export class DeviceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/devices';

  search(query: string): Observable<Device[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Device[]>(this.baseUrl, { params });
  }

  getStatusMap(): Observable<DeviceStatusMap> {
    return this.http.get<DeviceStatusMap>(`${this.baseUrl}/status`);
  }
}
