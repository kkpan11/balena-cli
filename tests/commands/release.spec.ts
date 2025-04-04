/**
 * @license
 * Copyright 2019-2020 Balena Ltd.
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

import { expect } from 'chai';

import { BalenaAPIMock } from '../nock/balena-api-mock';
import { cleanOutput, runCommand } from '../helpers';

describe('balena release', function () {
	let api: BalenaAPIMock;

	beforeEach(() => {
		api = new BalenaAPIMock();
		api.expectGetWhoAmI({ optional: true, persist: true });
	});

	afterEach(() => {
		// Check all expected api calls have been made and clean up.
		api.done();
	});

	it('should show release details', async () => {
		api.expectGetRelease();
		const { out } = await runCommand('release 27fda508c');
		const lines = cleanOutput(out);
		expect(lines[0]).to.contain('ID: ');
		expect(lines[0]).to.contain(' 142334');
		expect(lines[1]).to.contain('COMMIT: ');
		expect(lines[1]).to.contain(' 90247b54de4fa7a0a3cbc85e73c68039');
	});

	it('should return release composition', async () => {
		api.expectGetRelease();
		const { out } = await runCommand('release 27fda508c --composition');
		const lines = cleanOutput(out);
		expect(lines[0]).to.be.equal("version: '2.1'");
		expect(lines[1]).to.be.equal('networks: {}');
		expect(lines[2]).to.be.equal('volumes:');
		expect(lines[3]).to.be.equal('resin-data: {}');
		expect(lines[4]).to.be.equal('services:');
		expect(lines[5]).to.be.equal('main:');
	});

	it('should print version information as JSON with the the -j/--json flag', async () => {
		api.expectGetRelease();
		const { err, out } = await runCommand('release 27fda508c --json');
		expect(err).to.be.empty;
		const json = JSON.parse(out.join(''));
		expect(json.commit).to.equal('90247b54de4fa7a0a3cbc85e73c68039');
		expect(json.release_tag[0].tag_key).to.equal('testtag1');
		expect(json.composition.services.main.network_mode).to.equal('host');
	});

	it('should list releases', async () => {
		api.expectGetRelease();
		api.expectGetApplication();
		const { out } = await runCommand('release list someapp');
		const lines = cleanOutput(out);
		expect(lines.length).to.be.equal(2);
		expect(lines[1]).to.contain('142334');
		expect(lines[1]).to.contain('90247b54de4fa7a0a3cbc85e73c68039');
	});

	it('should list releases as JSON with the -j/--json flag', async () => {
		api.expectGetRelease();
		api.expectGetApplication();
		const { err, out } = await runCommand('release list someapp --json');
		expect(err).to.be.empty;
		const json = JSON.parse(out.join(''));
		expect(json[0].commit).to.equal('90247b54de4fa7a0a3cbc85e73c68039');
		expect(json[0].release_image[0].image[0].start_timestamp).to.equal(
			'2020-01-04T01:13:08.583Z',
		);
	});
});
