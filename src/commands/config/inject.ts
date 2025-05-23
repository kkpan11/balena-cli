/**
 * @license
 * Copyright 2016-2021 Balena Ltd.
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

import { Args, Command } from '@oclif/core';
import * as cf from '../../utils/common-flags';
import { getVisuals, stripIndent } from '../../utils/lazy';

export default class ConfigInjectCmd extends Command {
	public static description = stripIndent`
		Inject a config.json file to a balenaOS image or attached media.

		Inject a 'config.json' file to a balenaOS image file or attached SD card or
		USB stick.

		Documentation for the balenaOS 'config.json' file can be found at:
		https://www.balena.io/docs/reference/OS/configuration/
	`;

	public static examples = [
		'$ balena config inject my/config.json',
		'$ balena config inject my/config.json --drive /dev/disk2',
	];

	public static args = {
		file: Args.string({
			description: 'the path to the config.json file to inject',
			required: true,
		}),
	};

	public static flags = {
		drive: cf.driveOrImg,
	};

	public static root = true;
	public static offlineCompatible = true;

	public async run() {
		const { args: params, flags: options } = await this.parse(ConfigInjectCmd);

		const { safeUmount } = await import('../../utils/umount');

		const drive =
			options.drive || (await getVisuals().drive('Select the device/OS drive'));
		await safeUmount(drive);

		const fs = await import('fs');
		const configJSON = JSON.parse(
			await fs.promises.readFile(params.file, 'utf8'),
		);

		const config = await import('balena-config-json');
		await config.write(
			drive,
			// Will be removed in the next major of balena-config-json
			undefined,
			configJSON,
		);

		console.info('Done');
	}
}
