/**
 * @license
 * Copyright 2016-2020 Balena Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Command } from '@oclif/core';
import { ExpectedError } from '../../errors';
import * as cf from '../../utils/common-flags';
import { getBalenaSdk, getVisuals, stripIndent } from '../../utils/lazy';
import { applicationIdInfo } from '../../utils/messages';

export default class TagListCmd extends Command {
	public static aliases = ['tags'];
	public static deprecateAliases = true;

	public static description = stripIndent`
		List all tags for a fleet, device or release.

		List all tags and their values for the specified fleet, device or release.

		${applicationIdInfo.split('\n').join('\n\t\t')}
	`;

	public static examples = [
		'$ balena tag list --fleet MyFleet',
		'$ balena tag list -f myorg/myfleet',
		'$ balena tag list --device 7cf02a6',
		'$ balena tag list --release 1234',
		'$ balena tag list --release b376b0e544e9429483b656490e5b9443b4349bd6',
	];

	public static flags = {
		fleet: {
			...cf.fleet,
			exclusive: ['device', 'release'],
		},
		device: {
			...cf.device,
			exclusive: ['fleet', 'release'],
		},
		release: {
			...cf.release,
			exclusive: ['fleet', 'device'],
		},
	};

	public static authenticated = true;

	public async run() {
		const { flags: options } = await this.parse(TagListCmd);

		const balena = getBalenaSdk();

		// Check user has specified one of application/device/release
		if (!options.fleet && !options.device && !options.release) {
			throw new ExpectedError(this.missingResourceMessage);
		}

		let tags;

		if (options.fleet) {
			const { getFleetSlug } = await import('../../utils/sdk');
			tags = await balena.models.application.tags.getAllByApplication(
				await getFleetSlug(balena, options.fleet),
			);
		}
		if (options.device) {
			tags = await balena.models.device.tags.getAllByDevice(options.device);
		}
		if (options.release) {
			const { disambiguateReleaseParam } = await import(
				'../../utils/normalization'
			);
			const releaseParam = await disambiguateReleaseParam(
				balena,
				options.release,
			);

			tags = await balena.models.release.tags.getAllByRelease(releaseParam);
		}

		if (!tags || tags.length === 0) {
			throw new ExpectedError('No tags found');
		}

		console.log(getVisuals().table.horizontal(tags, ['tag_key', 'value']));
	}

	protected missingResourceMessage = stripIndent`
					To list tags for a resource, you must provide exactly one of:

					  * A fleet, with --fleet <fleetNameOrSlug>
					  * A device, with --device <uuid>
					  * A release, with --release <id or commit>

					See the help page for examples:

					  $ balena help tag list
	`;
}
