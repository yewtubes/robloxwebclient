#!/usr/bin/env node
// Platform administration on the database directly (no running backend needed).
//   node tools/admin.js user create <name> <password> [--birthdate YYYY-MM-DD] [--display <name>]
//   node tools/admin.js user list | user password <name> <pw> | user ban <name> | user unban <name>
//   node tools/admin.js user verify <name> | user unverify <name>  the verified badge
//   node tools/admin.js group add <groupId> <name> [--rank 1-255] [--role <name>] | group remove <groupId> <name> | group list [<name>]
//   node tools/admin.js admin <name> | unadmin <name>             Roblox admin badge (group 1200769, rank 255)
//   node tools/admin.js friend <name> <name>                      make two users friends
//   node tools/admin.js block <name> <name> | unblock <name> <name>  first user blocks/unblocks the second
//   node tools/admin.js universe create <id> <name> --creator <userId> [--max 10]
//   node tools/admin.js place add <placeId> <universeId> <file> [--name <n>] [--root]
//   node tools/admin.js universe icon <universeId> <imageAssetId> | universe thumbnail <universeId> <imageAssetId>
//   node tools/admin.js asset import <assetId> <file> [--type <assetTypeId>] [--name <n>]
//   node tools/admin.js asset import-legacy                       webclient/assets/* into the store
//   node tools/admin.js asset misses                              what the store could not serve, and why
//   node tools/admin.js asset fetch <assetId>...                  pull assets in through ASSET_FALLBACK (logged)
//   node tools/admin.js avatar show <name>                        the account's avatar (as avatar-fetch serves it)
//   node tools/admin.js avatar wear <name> <assetId>...           set what the account wears (fetched if missing)
//   node tools/admin.js avatar type <name> R6|R15
//   node tools/admin.js avatar colors <name> <head> <torso> <leftArm> <rightArm> <leftLeg> <rightLeg>   BrickColor ids
//   node tools/admin.js server register <placeId> <host> <port> [transportPort] [--job <id>] [--cert <hex>]
//   node tools/admin.js server heartbeat <jobId> | server close <jobId> | server list
//   node tools/admin.js render list
const fs = require('fs'), path = require('path');
const { open, now, ROOT } = require('./backend/db.js');
const A = require('./backend/auth.js');
const M = require('./backend/model.js');
const S = require('./backend/assets.js');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const flag = (k) => { const i = argv.indexOf(`--${k}`); if (i >= 0) argv.splice(i, 1); return i >= 0; };
const die = (m) => { console.error(m); process.exit(1); };
const userArg = (n) => A.getUserByName(n) || (/^\d+$/.test(n) && A.getUser(+n)) || die(`no user ${n}`);
const db = open();

const rankOpt = opt('rank'), roleOpt = opt('role');
const birthdate = opt('birthdate'), display = opt('display'), creator = opt('creator'), max = opt('max'), nameOpt = opt('name'),
  type = opt('type'), job = opt('job'), cert = opt('cert'), root = flag('root');
const [cmd, sub, ...a] = argv;

switch (`${cmd} ${sub}`) {
  case 'user create': {
    const err = A.validateNewUser({ username: a[0], password: a[1], displayName: display });
    if (err) die(err);
    const u = A.createUser({ username: a[0], password: a[1], displayName: display, birthdate });
    console.log(`user ${u.id} ${u.name}`);
    break;
  }
  case 'user list':
    for (const u of db.prepare('SELECT id, name, display_name, birthdate, is_banned, is_service, created_at FROM users ORDER BY id').all()) console.log(u);
    break;
  case 'user password': db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(A.hashPassword(a[1]), userArg(a[0]).id); console.log('ok'); break;
  case 'user ban': case 'user unban':
    db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(sub === 'ban' ? 1 : 0, userArg(a[0]).id);
    if (sub === 'ban') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userArg(a[0]).id);
    console.log('ok');
    break;
  case 'user verify': case 'user unverify':
    db.prepare('UPDATE users SET has_verified_badge = ? WHERE id = ?').run(sub === 'verify' ? 1 : 0, userArg(a[0]).id);
    console.log('ok');
    break;
  case 'group add': case 'group remove': case `admin ${sub}`: case `unadmin ${sub}`: {
    const admin = cmd === 'admin' || cmd === 'unadmin';
    const gid = admin ? 1200769 : +a[0], x = userArg(admin ? sub : a[1]);
    if (!(gid > 0)) die('bad group id');
    if (cmd === 'admin' || sub === 'add') {
      const rank = +(rankOpt || (admin ? 255 : 1));
      if (!(rank >= 1 && rank <= 255)) die('--rank must be 1-255');
      db.prepare(`INSERT INTO group_members (group_id, user_id, role_name, rank, created_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(group_id, user_id) DO UPDATE SET role_name = excluded.role_name, rank = excluded.rank`)
        .run(gid, x.id, roleOpt || (admin ? 'Admin' : 'Member'), rank, now());
    } else db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(gid, x.id);
    console.log('ok');
    break;
  }
  case `group list`:
    for (const r of db.prepare('SELECT g.group_id, u.name, g.role_name, g.rank FROM group_members g JOIN users u ON u.id = g.user_id WHERE ? IS NULL OR u.name = ? ORDER BY g.group_id, g.rank DESC').all(a[0] ?? null, a[0] ?? null)) console.log(r);
    break;
  case `friend ${sub}`: {
    const x = userArg(sub), y = userArg(a[0]);
    for (const [p, q] of [[x, y], [y, x]]) db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)').run(p.id, q.id, now());
    console.log(`${x.name} <-> ${y.name}`);
    break;
  }
  case `block ${sub}`:
  case `unblock ${sub}`: {
    const x = userArg(sub), y = userArg(a[0]);
    if (cmd.startsWith('block')) db.prepare('INSERT OR IGNORE INTO user_blocks (user_id, blocked_id, created_at) VALUES (?, ?, ?)').run(x.id, y.id, now());
    else db.prepare('DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?').run(x.id, y.id);
    console.log(`${x.name} ${cmd.startsWith('block') ? 'blocks' : 'unblocked'} ${y.name}`);
    break;
  }
  case 'universe create':
    db.prepare(`INSERT INTO universes (id, name, creator_type, creator_id, max_players, created_at, updated_at) VALUES (?, ?, 'User', ?, ?, ?, ?)`)
      .run(+a[0], a[1], +(creator || 1), +(max || 10), now(), now());
    console.log(`universe ${a[0]}`);
    break;
  case 'universe icon': case 'universe thumbnail':
    if (!S.getAsset(+a[1])) die(`asset ${a[1]} is not in the store (asset import first)`);
    db.prepare(`UPDATE universes SET ${sub === 'icon' ? 'icon_asset_id' : 'thumbnail_asset_id'} = ?, updated_at = ? WHERE id = ?`).run(+a[1], now(), +a[0]);
    console.log('ok');
    break;
  case 'place add': {
    const g = M.universe(+a[1]) || die(`no universe ${a[1]}`);
    const file = path.relative(ROOT, path.resolve(a[2]));
    db.prepare(`INSERT INTO places (id, universe_id, name, file_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET file_path = excluded.file_path, version = version + 1, updated_at = excluded.updated_at`)
      .run(+a[0], g.id, nameOpt || g.name, file, now(), now());
    if (root || !g.root_place_id) db.prepare('UPDATE universes SET root_place_id = ? WHERE id = ?').run(+a[0], g.id);
    console.log(`place ${a[0]} -> ${file}`);
    break;
  }
  case 'asset import': {
    const v = S.putAsset(+a[0], fs.readFileSync(a[1]), { assetTypeId: +(type || 0), name: nameOpt || path.basename(a[1]), source: 'import' });
    console.log(`asset ${a[0]} version ${v}`);
    break;
  }
  case 'asset import-legacy': {
    const dir = path.join(ROOT, 'webclient', 'assets');
    let n = 0;
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) if (/^\d+$/.test(f) && S.resolveId(+f)) n++;
    console.log(`${n} legacy assets in the store`);
    break;
  }
  case 'asset misses':
    for (const r of db.prepare('SELECT * FROM asset_misses ORDER BY last_at DESC').all()) console.log(`${r.asset_key}\t${r.outcome}\t${r.count}x\t${r.detail || ''}`);
    break;
  case 'server register': {
    const s = M.upsertServer({ jobId: job, placeId: +a[0], host: a[1], port: +a[2], transportPort: a[3] ? +a[3] : null, certHash: cert || null, source: 'registered' });
    console.log(s.job_id);
    break;
  }
  case 'server heartbeat': if (!M.heartbeatServer(a[0])) die('no such server'); break;
  case 'server close': M.closeServer(a[0]); console.log('closed'); break;
  case 'server list':
    for (const s of M.activeServers ? db.prepare(`SELECT * FROM game_servers WHERE status = 'active'`).all() : []) console.log({ ...s, players: M.serverPlayers(s.job_id) });
    break;
  case 'asset fetch':
    (async () => {
      for (const id of a.map(Number)) {
        const r = await S.ensure(id), x = S.getAsset(id);
        console.log(r ? `${id}: type ${x.asset_type_id} ${JSON.stringify(x.name)} (${x.source})` : `${id}: not available (see asset misses)`);
      }
    })();
    break;
  case `avatar ${sub}`: {
    const u = userArg(a[0]);
    if (sub === 'wear') {
      M.wearable(a.slice(1).map(Number)).then(({ ok, invalid }) => {
        M.saveAvatar(u.id, { assets: ok });
        console.log(`${u.name} wears ${ok.map((x) => `${x.id} (type ${x.assetTypeId})`).join(', ') || 'nothing'}${invalid.length ? `; not wearable or unavailable: ${invalid.join(', ')}` : ''}`);
      });
      break;
    }
    if (sub === 'type') {
      if (!/^R(6|15)$/.test(a[1] || '')) die('avatar type <name> R6|R15');
      M.saveAvatar(u.id, { avatarType: a[1] });
    } else if (sub === 'colors') {
      const keys = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'], v = a.slice(1).map(Number);
      if (v.length !== 6 || v.some((c) => !M.BRICK[c])) die('avatar colors <name> <6 BrickColor ids>');
      M.saveAvatar(u.id, { colors: Object.fromEntries(keys.map((k, i) => [k, v[i]])) });
    } else if (sub !== 'show') die('avatar show|wear|type|colors');
    console.log(M.avatarOf(u.id));
    break;
  }
  case 'render list':
    for (const r of db.prepare('SELECT key, state, attempts, error, requested_at, completed_at FROM thumbnails ORDER BY requested_at DESC LIMIT 50').all()) console.log(r);
    break;
  default:
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
}
