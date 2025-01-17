/**
 * QuickAccess pagemod.
 *
 * This page mod drives the quick access default popup.
 *
 * @copyright (c) 2019 Passbolt SA
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */
import {Worker as WorkerModel} from "../model/worker";
import {App as app} from "../app";
import Worker from "../sdk/worker";
import GetLegacyAccountService from "../service/account/getLegacyAccountService";

/*
 * This page mod drives the quick access default popup
 */
class QuickAccess {
  constructor() {
    // The current active worker.
    this._worker = null;
    this.handleOnConnect = this.handleOnConnect.bind(this);
  }

  /**
   * Initialize the Quickaccess by listening to the onConnect event.
   */
  init() {
    chrome.runtime.onConnect.addListener(this.handleOnConnect);
  }

  /**
   * Handle port connection by listening to application events and register a new worker.
   * @param {Port} port
   */
  async handleOnConnect(port) {
    const isQuickAccessPort = port.name === "quickaccess";
    if (!isQuickAccessPort) {
      return;
    }

    // QuickAccess should connect a port only from the toolbar action panel or as a detached window as a top frame.
    const isToolbarPanel = typeof(port.sender?.tab) === "undefined";
    const isTopLevelIframe = port.sender?.frameId === 0;
    if (!isToolbarPanel && !isTopLevelIframe) {
      console.error('quickAccessPagemod::attach can not attach quick access to untrusted frame.');
      return;
    }

    this._worker = new Worker(port, port.sender.tab);

    /*
     * Retrieve the account associated with this worker.
     * @todo This method comes to replace the User.getInstance().get()
     */
    let account;
    try {
      account = await GetLegacyAccountService.get();
    } catch (error) {
      /*
       * Ensure the application does not crash completely if the legacy account cannot be retrieved.
       */
      console.error('quickAccessPagemod::attach legacy account cannot be retrieved, please contact your administrator.');
      console.error(error);
    }

    app.events.auth.listen(this._worker, account);
    app.events.config.listen(this._worker);
    app.events.keyring.listen(this._worker);
    app.events.quickAccess.listen(this._worker);
    app.events.group.listen(this._worker);
    app.events.tag.listen(this._worker);
    app.events.resource.listen(this._worker);
    app.events.secret.listen(this._worker);
    app.events.pownedPassword.listen(this._worker);
    app.events.organizationSettings.listen(this._worker);
    app.events.tab.listen(this._worker);
    app.events.locale.listen(this._worker);
    app.events.passwordGenerator.listen(this._worker);

    WorkerModel.add('QuickAccess', this._worker);
    /*
     * Notify the content script that the pagemod is ready to communicate.
     * This notification is usually sent by the page-mod itself after the events are attached, however the quickaccess is not a pagemod.
     */
    this._worker.port.emit("passbolt.port.ready");
  }
}

export default new QuickAccess();
