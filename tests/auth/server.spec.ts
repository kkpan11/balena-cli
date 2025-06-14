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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import got from 'got';
import * as sinon from 'sinon';

import { LoginServer } from '../../build/auth/server';
import * as utils from '../../build/auth/utils';
import tokens from './tokens';

chai.use(chaiAsPromised);

const { expect } = chai;

function getPage(name: string): string {
	const pagePath = path.join(
		__dirname,
		'..',
		'..',
		'build',
		'auth',
		'pages',
		`${name}.ejs`,
	);
	const tpl = fs.readFileSync(pagePath, { encoding: 'utf8' });
	const compiledTpl = ejs.compile(tpl);
	return compiledTpl();
}

describe('Login server:', function () {
	let server: LoginServer;
	let addr: { host: string; port: number; urlPath: string };

	this.beforeEach(async () => {
		server = new LoginServer();
		await server.start();
		addr = server.getAddress();
		expect(addr.host).to.equal('127.0.0.1');
	});

	this.afterEach(() => {
		server.shutdown();
	});

	async function testLogin({
		verb = 'post',
		...opt
	}: {
		expectedBody: string;
		expectedErrorMsg?: string;
		expectedStatusCode: number;
		expectedToken: string;
		urlPath?: string;
		verb?: 'post' | 'put';
	}) {
		opt.urlPath = opt.urlPath ?? addr.urlPath;
		const res = await got[verb](
			`http://${addr.host}:${addr.port}${opt.urlPath}`,
			{
				form: {
					token: opt.expectedToken,
				},
				throwHttpErrors: false,
			},
		);

		expect(res.body).to.equal(opt.expectedBody);
		expect(res.statusCode).to.equal(opt.expectedStatusCode);

		try {
			const token = await server.awaitForToken();
			if (opt.expectedErrorMsg) {
				throw new Error('Error not thrown when expected');
			} else {
				expect(token).to.exist;
				expect(token).to.equal(opt.expectedToken);
			}
		} catch (err) {
			if (opt.expectedErrorMsg) {
				expect(err).to.have.property('message', opt.expectedErrorMsg);
			} else {
				throw err;
			}
		}
	}

	it('should get 404 if posting to an unknown path', async () => {
		await testLogin({
			expectedBody: 'Not found',
			expectedStatusCode: 404,
			expectedToken: tokens.johndoe.token,
			expectedErrorMsg: 'Unknown path or verb',
			urlPath: '/foobarbaz',
		});
	});

	it('should get 404 if not using the correct verb', async () => {
		await testLogin({
			expectedBody: 'Not found',
			expectedStatusCode: 404,
			expectedToken: tokens.johndoe.token,
			expectedErrorMsg: 'Unknown path or verb',
			verb: 'put',
		});
	});

	describe('given the token authenticates with the server', function () {
		beforeEach(function () {
			this.loginIfTokenValidStub = sinon.stub(utils, 'loginIfTokenValid');
			this.loginIfTokenValidStub.resolves(true);
		});

		afterEach(function () {
			this.loginIfTokenValidStub.restore();
		});

		it('should eventually be the token', async () => {
			await testLogin({
				expectedBody: getPage('success'),
				expectedStatusCode: 200,
				expectedToken: tokens.johndoe.token,
			});
		});
	});

	describe('given the token does not authenticate with the server', function () {
		beforeEach(function () {
			this.loginIfTokenValidStub = sinon.stub(utils, 'loginIfTokenValid');
			return this.loginIfTokenValidStub.resolves(false);
		});

		afterEach(function () {
			return this.loginIfTokenValidStub.restore();
		});

		it('should be rejected', async () => {
			await testLogin({
				expectedBody: getPage('error'),
				expectedStatusCode: 401,
				expectedToken: tokens.johndoe.token,
				expectedErrorMsg: 'Invalid token',
			});
		});

		it('should be rejected if no token', async () => {
			await testLogin({
				expectedBody: getPage('error'),
				expectedStatusCode: 401,
				expectedToken: '',
				expectedErrorMsg: 'No token',
			});
		});

		it('should be rejected if token is malformed', async () => {
			await testLogin({
				expectedBody: getPage('error'),
				expectedStatusCode: 401,
				expectedToken: 'asdf',
				expectedErrorMsg: 'Invalid token',
			});
		});
	});
});
