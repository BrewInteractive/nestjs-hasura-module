import {
  AuthorizationOptions,
  HasuraConfig,
  HasuraHeaders,
  HasuraRequest,
  RequestFlags,
} from './models';
import { GraphQLClient, Variables } from 'graphql-request';

import { Injectable } from '@nestjs/common';
import { MissingAdminSecret } from './error';

@Injectable()
export class HasuraService {
  private readonly graphQLClient: GraphQLClient;
  private readonly adminSecret?: string;

  constructor(private readonly hasuraConfig: HasuraConfig) {
    this.graphQLClient = new GraphQLClient(this.hasuraConfig.graphqlEndpoint);
    this.adminSecret = this.hasuraConfig?.adminSecret;
  }

  requestAsync<T, V extends Variables = Variables>(
    hasuraRequest: HasuraRequest<V>,
  ): Promise<T> {
    const headers = {
      ...(hasuraRequest?.headers || {}),
      ...this.createHeadersByRunQueryFlags(hasuraRequest?.requestFlags),
      ...this.createHeadersByAuthorizationOptions(
        hasuraRequest?.authorizationOptions || {},
      ),
    };

    return this.graphQLClient.request<T>(
      hasuraRequest.query,
      hasuraRequest.variables,
      headers,
    );
  }

  private getAdminSecret(): string {
    if (this.adminSecret) return this.adminSecret;

    throw new MissingAdminSecret();
  }

  private createHeadersByRunQueryFlags(flags: RequestFlags) {
    const headers = {};
    if ((RequestFlags.UseAdminSecret | flags) == flags)
      headers['x-hasura-admin-secret'] = this.getAdminSecret();

    if ((RequestFlags.UseAdminSecret | flags) == flags)
      headers['x-hasura-use-backend-only-permissions'] = true;

    return headers;
  }

  private createHeadersByAuthorizationOptions(options: AuthorizationOptions) {
    return Object.entries(options).reduce((acc, [key, value]) => {
      const headerKey = HasuraHeaders[key];
      if (headerKey === 'authorization') acc[headerKey] = `Bearer ${value}`;
      else if (headerKey) acc[headerKey] = value;
      return acc;
    }, {});
  }
}
