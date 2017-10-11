/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import jose from "node-jose";

import CONFIGS from "./configs";

export async function fetchFromFxA(reason, url, config) {
  let response = await fetch(url, config);
  let body = await response.json();
  if (!response.ok) {
    // body is FxA error response
    console.log(`${reason} request failed: ${JSON.stringify(body)}`);
    let err = new Error(`${reason} request failed: ${body.message}`);
    Object.assign(err, {
      code: body.code,
      errno: body.errno,
    });
    throw err;
  }
  return body;
}

// OAUTH Routines
async function makeAuthzURL(config, {challenge, ...params}) {
  if (challenge) {
    let code;
    code = (new TextEncoder()).encode(challenge);
    code = await jose.JWA.digest("SHA-256", code);
    code = jose.util.base64url.encode(code);

    params = {
      ...params,
      "code_challenge": code,
      "code_challenge_method": "S256",
    };
  }
  let query = new URLSearchParams(params).toString();

  return `${config.oauth_uri}/authorization?${query}`;
}

function parseAuthzResponse(url, state) {
  url = new URL(url);

  if (!url.search) {
    throw new Error("OAUTH response parameters missing");
  }

  if (url.searchParams.get("state") !== state) {
    throw new Error("OAUTH state does not match");
  }

  return url.searchParams;
}

// FxA Routines
async function fetchToken(config, code, challenge) {
  let params = {
    grant_type: "authorization_code",
    client_id: config.client_id,
    client_secret: config.client_secret,
    verifier_code: challenge,
    code,
  };

  let response = await fetchFromFxA("OAUTH token", `${config.oauth_uri}/token`, {
    method: "post",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-cache",
  });
  return response;
}

async function fetchProfile(config, token) {
  let response = await fetchFromFxA("profile", `${config.profile_uri}/profile`, {
    method: "get",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    cache: "no-cache",
  });
  return response;
}

// Password Routines
async function calculateCredentials(email, password) {
  const NAMESPACE = "identity.mozilla.com/picl/v1/";
  const PBKDF2 = {
    iterations: 1000,
    length: 32,
  };
  const HKDF = {
    salt: new Uint8Array([0]),
    length: 32,
  };

  function utf8(input) {
    return new Buffer(input, "utf8");
  }
  function kw(name) {
    return utf8(`${NAMESPACE}${name}`);
  }
  function kwe(name, email) {
    return utf8(`${NAMESPACE}${name}:${email}`);
  }

  let authPW = await Promise.resolve(utf8(password || "")).
    then((password) => {
      let params = {
        ...PBKDF2,
        salt: kwe("quickStretch", email),
      };
      return jose.JWA.derive("PBKDF2-SHA-256", password, params);
    }).
    then((quickStretchedPW) => {
      let params = {
        ...HKDF,
        info: kw("authPW"),
      }
      return jose.JWA.derive("HKDF-SHA-256", quickStretchedPW, params);
    });

  authPW = authPW.toString("hex");
  return {
    email,
    authPW,
    "reason": "password_check",
  };
}

const DEFAULT_CONFIG = "dev-latest";

export class Authorization {
  constructor({config = DEFAULT_CONFIG, info}) {
    if (!CONFIGS[config]) {
      throw new Error(`unknown configuration: ${config}`);
    }
    this.config = config;
    this.info = info || undefined;
  }

  toJSON() {
    let { config, info } = this;
    if (info) {
      info = { ...info };
      delete info.email;
    }
    return {
      config,
      info,
    };
  }

  get signedIn() { return this.info !== undefined; }
  get verified() { return (this.info && this.info.verified) || false; }

  get uid() { return (this.info && this.info.uid) || undefined; }
  get email() { return (this.info && this.info.email) || undefined; }

  async signIn(interactive = true) {
    let config = CONFIGS[this.config];

    let state = jose.util.base64url.encode(jose.util.randomBytes(16)),
        challenge;

    if (config.pkce) {
      challenge = jose.util.base64url.encode(jose.util.randomBytes(32));
    }

    // authz request/response
    let url = await makeAuthzURL(config, {
      client_id: config.client_id,
      redirect_uri: config.redirect_uri,
      scope: config.scopes.join(" "),
      state,
      challenge,
    });
    let response = await browser.identity.launchWebAuthFlow({
      url,
      interactive,
    });
    response = parseAuthzResponse(response, state);

    // token request/response
    response = await fetchToken(config, response.get("code"), challenge);
    let oauth = response;

    response = await fetchProfile(config, oauth.access_token);
    let profile = response;

    this.info = {
      ...profile,
      access: {
        validFrom: new Date(oauth.auth_at * 1000).toISOString(),
        validUntil: new Date((oauth.auth_at + oauth.expires_in) * 1000).toISOString(),
      },
    };
    return this.info;
  }

  async signOut() {
    // TODO: something server side?
    this.info = undefined;
  }

  async verify(password) {
    if (!this.signedIn) {
      throw new Error("not signed in");
    }

    let config = CONFIGS[this.config];

    let creds = await calculateCredentials(this.email, password);
    await fetchFromFxA(
      "password verification",
      `${config.fxa_auth_uri}/account/login`,
      {
        method: "post",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(creds),
      }
    );
    this.info.verified = true;

    // TODO: do something with the body?
    return password;
  }
}

let authorization;
export default function getAuthorization() {
  if (!authorization) {
    authorization = new Authorization({});
  }
  return authorization;
}

export async function loadAuthorization(storage) {
  let stored = await storage.get("authz");
  if (stored && stored.authz) {
    authorization = new Authorization(stored.authz);
  }
  return getAuthorization();
}

export async function saveAuthorization(storage) {
  let authz = getAuthorization().toJSON();
  await storage.set({ authz });
}

export function setAuthorization(config, info) {
  authorization = config ? new Authorization({config, info}) : undefined;
}
