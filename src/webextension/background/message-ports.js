/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import openDataStore from "./datastore";
import * as authz from "./authorization";
import updateBrowserAction from "./browser-action";
import { openView, closeView } from "./views";
import { makeItemSummary } from "../common";

const ports = new Set();

function broadcast(message, excludedSender) {
  for (let p of ports) {
    if (!excludedSender || p.sender.contextId !== excludedSender.contextId) {
      p.postMessage(message);
    }
  }
}

export default function initializeMessagePorts() {
  browser.runtime.onConnect.addListener((port) => {
    ports.add(port);
    port.onDisconnect.addListener(() => ports.delete(port));
  });

  browser.runtime.onMessage.addListener(async function(message, sender) {
    switch (message.type) {
    case "open_view":
      return openView(message.name);
    case "close_view":
      return closeView(message.name);

    case "signin":
      return authz.signIn(message.interactive);
    case "initialize":
      return authz.verify(message.email, message.password).
        then(() => openDataStore()).
        then(async(ds) => {
          await ds.initialize({
            password: message.password,
          });
          await updateBrowserAction(ds);
        });

    case "unlock":
      return openDataStore().then(async(ds) => {
          await ds.unlock(message.password);
          await updateBrowserAction(ds);
        });
    case "lock":
      return openDataStore().then(async(ds) => {
        await ds.lock();
        await updateBrowserAction(ds);
      });

    case "list_items":
      return openDataStore().then(async(ds) => {
        return {items: Array.from((await ds.list()).values(),
                                  makeItemSummary)};
      });

    case "add_item":
      return openDataStore().then(async(ds) => {
        const item = await ds.add(message.item);
        broadcast({type: "added_item", item}, sender);
        return {item};
      });
    case "update_item":
      return openDataStore().then(async(ds) => {
        const item = await ds.update(message.item);
        broadcast({type: "updated_item", item}, sender);
        return {item};
      });
    case "remove_item":
      return openDataStore().then(async(ds) => {
        await ds.remove(message.id);
        broadcast({type: "removed_item", id: message.id}, sender);
        return {};
      });
    case "get_item":
      return openDataStore().then(async(ds) => {
        return {item: await ds.get(message.id)};
      });
    default:
      throw new Error(`unknown message type "${message.type}`);
    }
  });
}
