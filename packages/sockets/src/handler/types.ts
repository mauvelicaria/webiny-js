import { HandlerFactoryParams } from "@webiny/handler-aws/types";
import { ISocketsEventValidator } from "~/validator";
import { ISocketsResponse } from "~/response";
import { PartialDeep } from "type-fest";
import { APIGatewayProxyResult, Context as LambdaContext } from "aws-lambda";

export interface HandlerCallable {
    (event: PartialDeep<ISocketsEvent>, context: LambdaContext): Promise<APIGatewayProxyResult>;
}

export interface HandlerParams extends HandlerFactoryParams {
    validator?: ISocketsEventValidator;
    response?: ISocketsResponse;
}

export enum SocketsEventRoute {
    "connect" = "$connect",
    "disconnect" = "$disconnect",
    "default" = "$default"
}

export interface ISocketsEventDataIdentity {
    id: string;
}
export interface ISocketsEventData {
    tenant: string;
    locale: string;
    identity: ISocketsEventDataIdentity;
}

export enum SocketsEventRequestContextEventType {
    "message" = "MESSAGE",
    "connect" = "CONNECT",
    "disconnect" = "DISCONNECT"
}

export interface ISocketsEventRequestContextAuthorizer {
    principalId: string;
}

export interface ISocketsEventRequestContextError {
    messageString: string;
    validationErrorString: string;
}

export interface ISocketsEventRequestContextIdentity {
    accountId: string;
    apiKey: string;
    apiKeyId: string;
    caller: string;
    cognitoAuthenticationProvider?: string;
    cognitoAuthenticationType?: string;
    cognitoIdentityId?: string;
    cognitoIdentityPoolId?: string;
    sourceIp: string;
    user: string;
    userAgent: string;
    userArn: string;
}

export interface ISocketsEventRequestContext {
    connectionId: string;
    connectedAt: number;
    domainName: string;
    eventType: SocketsEventRequestContextEventType;
    messageId?: string;
    routeKey: SocketsEventRoute | string;
    requestId: string;
    extendedRequestId: string;
    apiId: string;
    authorizer: ISocketsEventRequestContextAuthorizer;
    error: ISocketsEventRequestContextError;
    identity: ISocketsEventRequestContextIdentity;
    requestTime: string;
    requestTimeEpoch: number;
    stage: string;
    status: number;
}

export interface ISocketsEvent<T extends ISocketsEventData = ISocketsEventData> {
    requestContext: ISocketsEventRequestContext;
    data: T;
}
