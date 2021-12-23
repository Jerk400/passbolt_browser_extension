/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 * @since         3.5.0
 */
const openpgp = require('openpgp/dist/openpgp');
const textEncoding = require('text-encoding-utf-8');

import Validator from "validator";
import {dummyData} from "./validateAccountRecoveryOrganizationPrivateKeyService.test.data";
import {ValidateAccountRecoveryOrganizationPrivateKeyService} from "./validateAccountRecoveryOrganizationPrivateKeyService";
import {AccountRecoveryOrganizationPolicyEntity} from "../../../model/entity/accountRecovery/accountRecoveryOrganizationPolicyEntity";
import {PrivateGpgkeyEntity} from "../../../model/entity/gpgkey/privateGpgkeyEntity";
global.TextEncoder = textEncoding.TextEncoder;

// Reset the modules before each test.
beforeEach(() => {
  window.openpgp = openpgp;
  window.Validator = Validator;

  jest.resetModules();
});

function getValidatePromise(keyPair) {
  const accountRecoveryOrganisationPolicyEntity = new AccountRecoveryOrganizationPolicyEntity(keyPair.publicKey);
  const privateGpgkeyEntity = new PrivateGpgkeyEntity(keyPair.privateKey);

  return ValidateAccountRecoveryOrganizationPrivateKeyService.validate(accountRecoveryOrganisationPolicyEntity, privateGpgkeyEntity);
}

describe("Validate account recovery organization private key service", () => {
  it("should accept a viable key pair", () => {
    expect.assertions(1);
    const promise = getValidatePromise(dummyData.correctKeyPair);
    return expect(promise).resolves.toBe(true);
  });

  it("should refuse an invalid key pair", () => {
    expect.assertions(1);
    const promise = getValidatePromise(dummyData.invalidKeyPair);
    const expectedError = new Error("Error, this is not the current organization recovery key. Expected fingerprint: 03f60e958f4cb29723acdf761353b5b15d9b054f");
    return expect(promise).rejects.toThrow(expectedError);
  });

  it("should throw an exception if the passphrase is incorrect", () => {
    expect.assertions(1);
    const promise = getValidatePromise(dummyData.invalidPassphrase);
    return expect(promise).rejects.toThrow(new Error("This is not a valid passphrase"));
  });
});
