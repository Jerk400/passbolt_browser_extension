/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) 2023 Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) 2023 Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 * @since         4.0.0
 */
import Port from "../../all/background_page/sdk/port";
import PagemodManager from "../pagemod/pagemodManager";
import WorkersSessionStorage from "../service/sessionStorage/workersSessionStorage";
import WorkerEntity from "../../all/background_page/model/entity/worker/workerEntity";

class PortManager {
  constructor() {
    this._ports = {}; // Object{portId: port, ...} for which the port is available
    this.onPortConnect = this.onPortConnect.bind(this);
    this.onTabRemoved = this.onTabRemoved.bind(this);
  }

  /**
   * on port connect
   * @param port the port
   * @returns {Promise<void>}
   */
  async onPortConnect(port) {
    if (await this.isQuickAccessPort(port.sender)) {
      await this.registerAndAttachEvent(port, "QuickAccess");
    } else {
      await this.connectPortFromTab(port);
    }
  }

  /**
   * Connect port from tab
   * @param port the port
   * @returns {Promise<void>}
   */
  async connectPortFromTab(port) {
    const worker = await WorkersSessionStorage.getWorkerById(port.name);
    if (worker) {
      if (await this.isKnownPortSender(worker, port.sender)) {
        await this.registerAndAttachEvent(port, worker.name);
      }
    }
  }

  /**
   * Is quickAccess port sender
   * @param sender
   * @returns {Promise<boolean>}
   */
  async isQuickAccessPort(sender) {
    if (sender.tab) {
      // Tab property will only be present when the connection was opened from a tab
      return false;
    } else {
      // The sender is a script running in an extension page
      const popupUrl = await chrome.action.getPopup({});
      return sender.url === popupUrl;
    }
  }

  /**
   * Is known port sender
   * @param worker The worker
   * @param sender The sender
   * @returns {Promise<boolean>}
   */
  async isKnownPortSender(worker, sender) {
    if (worker.frameId === null) {
      worker.frameId = sender.frameId;
      await WorkersSessionStorage.updateWorker(new WorkerEntity(worker));
    }
    return worker.tabId === sender.tab.id && worker.frameId === sender.frameId;
  }

  /**
   * Register and attach event to the port
   * @param port The port
   * @param {string} name The pagemod name
   * @returns {Promise<void>}
   */
  async registerAndAttachEvent(port, name) {
    const portWrapper = new Port(port);
    this.registerPort(portWrapper);
    await PagemodManager.attachEventToPort(portWrapper, name);
    portWrapper.emit('passbolt.port.ready');
  }

  /**
   * Register the port
   * @param port
   */
  registerPort(port) {
    this._ports[port._port.name] = port;
  }

  /**
   * Disconnect and remove the port
   * @param {string} id the id
   * @returns <void>
   */
  removePort(id) {
    this._ports[id]?.disconnect();
    delete this._ports[id];
  }

  /**
   * Is port exist
   * @param {string} id The id
   * @returns {boolean}
   */
  isPortExist(id) {
    return Boolean(this._ports[id]);
  }

  /**
   * Get the port by id
   * @param {string} id The id
   * @returns {Port}
   */
  getPortById(id) {
    return this._ports[id];
  }

  /**
   * Flush.
   * @returns {Promise<void>}
   */
  async flush() {
    this._ports = {};
    await WorkersSessionStorage.flush();
  }

  /**
   * On tab removed, remove associated worker from the session storage and delete runtime ports references.
   * @param {number} tabId The tab id
   * @returns {Promise<void>}
   */
  async onTabRemoved(tabId) {
    if (typeof tabId === "undefined") {
      throw new Error("A tab identifier is required.");
    }
    if (!Number.isInteger(tabId)) {
      throw new Error("The tab identifier should be a valid integer.");
    }
    const workers = await WorkersSessionStorage.getWorkersByTabId(tabId);
    workers.forEach(worker => this.removePort(worker.id));
    await WorkersSessionStorage.delete(tabId);
  }
}

export default new PortManager();
