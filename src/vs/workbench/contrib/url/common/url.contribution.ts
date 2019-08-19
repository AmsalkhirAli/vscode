/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as ActionExtensions, IWorkbenchActionRegistry } from 'vs/workbench/common/actions';
import { IURLService } from 'vs/platform/url/common/url';
import { IQuickInputService, IQuickPickItem, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { URI } from 'vs/base/common/uri';
import { Action } from 'vs/base/common/actions';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';

export class OpenUrlAction extends Action {

	static readonly ID = 'workbench.action.url.openUrl';
	static readonly LABEL = localize('openUrl', "Open URL");

	constructor(
		id: string,
		label: string,
		@IURLService private readonly urlService: IURLService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
	) {
		super(id, label);
	}

	run(): Promise<any> {
		return this.quickInputService.input({ prompt: 'URL to open' }).then(input => {
			const uri = URI.parse(input);
			this.urlService.open(uri);
		});
	}
}

Registry.as<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions).registerWorkbenchAction(
	new SyncActionDescriptor(OpenUrlAction, OpenUrlAction.ID, OpenUrlAction.LABEL),
	'Open URL',
	localize('developer', 'Developer')
);

CommandsRegistry.registerCommand({
	id: 'workbench.action.configureTrustedDomains',
	description: {
		description: 'Configure Trusted Domains',
		args: [{ name: 'domainToConfigure', schema: { type: 'string' } }]
	},
	handler: (accessor, domainToConfigure?: string) => {
		const quickInputService = accessor.get(IQuickInputService);
		const storageService = accessor.get(IStorageService);

		let trustedDomains: string[] = [];
		try {
			trustedDomains = JSON.parse(storageService.get('http.trustedDomains', StorageScope.GLOBAL, '[]'));
		} catch (err) { }

		const domainQuickPickItems: IQuickPickItem[] = trustedDomains
			.filter(d => d !== '*')
			.map(d => {
				return {
					type: 'item',
					label: d,
					picked: true,
				};
			});

		const specialQuickPickItems: IQuickPickItem[] = [
			{
				type: 'item',
				label: 'Allow all links to be open without protection',
				picked: trustedDomains.indexOf('*') !== -1
			}
		];

		let domainToConfigureItem: IQuickPickItem | undefined = undefined;
		if (domainToConfigure) {
			domainToConfigureItem = { type: 'item', label: domainToConfigure, picked: true };
			specialQuickPickItems.push(<IQuickPickItem>domainToConfigureItem);
		}

		const quickPickItems: (IQuickPickItem | IQuickPickSeparator)[] = domainQuickPickItems.length === 0
			? specialQuickPickItems
			: [...specialQuickPickItems, { type: 'separator' }, ...domainQuickPickItems];

		return quickInputService.pick(quickPickItems, {
			canPickMany: true,
			activeItem: domainToConfigureItem
		}).then(result => {
			if (result) {
				storageService.store('http.trustedDomains', JSON.stringify(result.map(r => r.label)), StorageScope.GLOBAL);
			}
		});
	}
});
