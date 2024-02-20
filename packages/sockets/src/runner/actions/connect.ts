import { SocketsEventRoute } from "~/handler/types";
import { createSocketsRoutePlugin } from "~/plugins/SocketsRoutePlugin";

export const createSocketsRouteConnectPlugin = () => {
    return createSocketsRoutePlugin(SocketsEventRoute.connect, async params => {
        const { registry, event, response } = params;
        await registry.register({
            identity: event.data.identity,
            connectionId: event.requestContext.connectionId,
            tenant: event.data.tenant,
            locale: event.data.locale,
            domainName: event.requestContext.domainName,
            stage: event.requestContext.stage
        });

        return response.ok();
    });
};
