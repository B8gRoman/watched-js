import {
    Addon as AddonProps,
    RepositoryAddon as RepositoryAddonProps,
    RepositoryAddonActions
} from "@watchedcom/schema";

import { ActionHandlers } from "../interfaces";
import { makeCreateFunction } from "../utils/addon-func";

import { BasicAddon } from "./BasicAddon";

export type RepositoryHandlers = Pick<
    ActionHandlers<RepositoryAddon>,
    RepositoryAddonActions
>;

type Url = string;

export class RepositoryAddon extends BasicAddon<
    RepositoryHandlers,
    RepositoryAddonProps
> {
    private addons: BasicAddon[] = [];
    private urls: Url[] = [];

    constructor(p: RepositoryAddonProps) {
        super(p);

        this.registerActionHandler("repository", async (args, ctx) => {
            const result: AddonProps[] = [];

            for (const addon of this.addons) {
                const handler = addon.getActionHandler("addon");
                const props: AddonProps = await handler(
                    { ...args, index: true },
                    ctx
                );
                props.metadata = {
                    url: `'./${addon.getProps().id}`
                };
                result.push(props);
            }
            for (const url of this.urls) {
                // TODO: Load props from remote repo via a POST /addon call
                throw new Error("Repository URL's are not yet implemented");
            }
            return result;
        });
    }

    public async _resolveAddonUrl(url: Url): Promise<AddonProps> {
        return {} as any;
    }

    public getAddons() {
        return this.addons;
    }

    public addAddon(addon: BasicAddon) {
        this.addons.push(addon);
    }

    public addUrl(url: Url) {
        this.urls.push(url);
    }
}

export const createRepositoryAddon = makeCreateFunction({
    AddonClass: RepositoryAddon,
    type: "repository"
});
