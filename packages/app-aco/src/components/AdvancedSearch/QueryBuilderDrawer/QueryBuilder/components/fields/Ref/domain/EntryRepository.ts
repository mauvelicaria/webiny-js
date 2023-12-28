import { makeAutoObservable, runInAction } from "mobx";
import { EntryDTO } from "./Entry";
import { EntriesGatewayInterface } from "../gateways";
import { Loading } from "~/components/AdvancedSearch/domain";
import { EntryMapper } from "./EntryMapper";

export class EntryRepository {
    public readonly modelIds: string[];
    private gateway: EntriesGatewayInterface;
    private loading: Loading;
    private entries: EntryDTO[] = [];

    constructor(gateway: EntriesGatewayInterface, modelIds: string[]) {
        this.modelIds = modelIds;
        this.gateway = gateway;
        this.loading = new Loading();
        makeAutoObservable(this);
    }

    getEntries() {
        return this.entries;
    }

    getLoading() {
        return {
            isLoading: this.loading.isLoading
        };
    }

    async listEntries(query: string) {
        const response = await this.runWithLoading<EntryDTO[]>(
            this.gateway.list(this.modelIds, query)
        );

        if (!response) {
            return;
        }

        runInAction(() => {
            this.entries = response.map(entry => EntryMapper.toDTO(entry));
        });
    }

    async getEntryById(id: string) {
        const entryInCache = this.entries.find(entry => entry.id === id);

        if (entryInCache) {
            return entryInCache;
        }

        for (const modelId of this.modelIds) {
            const response = await this.runWithLoading<EntryDTO>(this.gateway.get(modelId, id));

            if (response) {
                const entryDTO = EntryMapper.toDTO(response);
                runInAction(() => {
                    this.entries = [entryDTO, ...this.entries];
                });

                return entryDTO;
            }
        }

        return;
    }

    private async runWithLoading<T>(action: Promise<T>) {
        return await this.loading.runCallbackWithLoading(action);
    }
}
