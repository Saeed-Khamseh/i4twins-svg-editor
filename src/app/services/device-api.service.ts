import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Device, DeviceStatusMap } from '../../../shared/api-types';

import { httpErrorContext } from '../interceptors/http-error.context';

@Injectable({ providedIn: 'root' })
export class DeviceApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/devices';

  search(query: string): Observable<Device[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Device[]>(this.baseUrl, {
      params,
      context: httpErrorContext('Error while searching devices'),
    });
  }

  getStatuses(deviceIds: readonly string[]): Observable<DeviceStatusMap> {
    return this.http.post<DeviceStatusMap>(
      `${this.baseUrl}/status`,
      { ids: deviceIds },
      {
        context: httpErrorContext('Error while trying to fetch device status'),
      },
    );
  }
}
