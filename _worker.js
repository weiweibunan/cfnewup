// CFnew - 终端 v3.0
// 版本: v3.0 
import { connect as 连接 } from 'cloudflare:sockets';
const 基础64文本解码器 = new TextDecoder();
function 解码64(文本) {
  const 二进制 = atob(文本);
  const 字节 = new Uint8Array(二进制.length);
  for (let 索引 = 0; 索引 < 二进制.length; 索引++) 字节[索引] = 二进制.charCodeAt(索引);
  return 基础64文本解码器.decode(字节);
}
let 认证令牌 = '351c9981-04b6-4103-aa4b-864aa9c91469';
let 回退地址 = '';
let 代理5配置 = '';
let 自定义优选地址列表 = [];
let 自定义优选域名列表 = [];
let 启用代理降级 = false;
let 仅走代理 = false;
let 禁用非传输层安全 = false;
let 禁用优选 = false;
let 启用地区匹配 = true;
let 当前工作器地区 = '';
let 手动工作器地区 = '';
let 优选地址源 = '';
let 自定义路径 = '';
let 启用明文 = true;
// 启用ECH功能（true启用，false禁用）
let 启用加密客户端问候 = false;
// 自定义DNS服务器（默认：https://223.5.5.5/dns-query）
let 自定义域名系统 = 'https://223.5.5.5/dns-query';
// 自定义ECH域名（默认：cloudflare-ech.com）
let 自定义加密客户端问候域名 = 'cloudflare-ech.com';
let 自定义应用层协议协商 = '';
let 启用优选域名 = true; // 优选域名默认关闭
let 启用优选地址 = true;
let 启用仓库优选 = true;
let 启用原生地址 = false; // 原生地址默认关闭          

let 键值存储 = null;
let 键值配置 = {};
let 键值配置上次加载 = 0;
const 键值缓存期限 = 30 * 1000; // 30秒缓存（短窗口内跳过版本检查）
let 键值配置版本 = '';
const 配置默认值 = {
  wk: '',
  ev: 'yes',
  ech: 'no',
  customDNS: 'https://223.5.5.5/dns-query',
  customECHDomain: 'cloudflare-ech.com',
  alpn: '',
  d: '',
  p: '',
  yx: '',
  yxURL: '',
  s: 'cfadmin88:K9xR2vP8mQ4wF7tL3bZ1@107.172.138.49:40001',
  ena: 'no',
  epd: 'yes',
  epi: 'yes',
  egi: 'yes',
  ae: '',
  rm: '',
  qj: 'no',
  dkby: 'no',
  yxby: '',
  ipv4: 'yes',
  ipv6: 'yes',
  ispMobile: 'yes',
  ispUnicom: 'yes',
  ispTelecom: 'yes'
};

function 是否开启值(值, 默认启用 = false) {
  if (值 === undefined || 值 === null || 值 === '') return 默认启用;
  if (值 === true || 值 === false) return 值;
  const 文本 = String(值).trim().toLowerCase();
  if (文本 === 'yes' || 文本 === 'true' || 文本 === '1' || 文本 === 'on') return true;
  if (文本 === 'no' || 文本 === 'false' || 文本 === '0' || 文本 === 'off') return false;
  return 默认启用;
}

function 归一配置开关(值, 默认启用 = false) {
  return 是否开启值(值, 默认启用) ? 'yes' : 'no';
}
 
function 获取配置开关值(键, 默认启用 = false, 备用值 = undefined) {
  const 默认值 = 备用值 !== undefined ? 备用值 : (默认启用 ? 'yes' : 'no');
  return 是否开启值(获取配置值(键, 默认值), 默认启用);
}

function 获取配置文本值(键, 默认值 = '', 备用值 = undefined) {
  const 值 = 获取配置值(键, 备用值 !== undefined ? 备用值 : 默认值);
  return 值 === undefined || 值 === null ? 默认值 : String(值);
}

function 整理有效配置(配置) {
  const 快照 = {
    ...配置默认值,
    ...配置
  };
  ['ev', 'ech', 'ena', 'epd', 'epi', 'egi', 'ipv4', 'ipv6', 'ispMobile', 'ispUnicom', 'ispTelecom'].forEach(键 => {
    快照[键] = 归一配置开关(快照[键], 是否开启值(配置默认值[键]));
  });
  if (快照.ev === 'no') {
    快照.ev = 'yes';
  }
  if (快照.ech === 'yes') {
    快照.dkby = 'yes';
  }
  return 快照;
}

function 读取环境配置值(环境值, ...名称列表) {
  if (!环境值) return undefined;
  for (const 名称 of 名称列表) {
    if (环境值[名称] !== undefined && 环境值[名称] !== null && 环境值[名称] !== '') {
      return 环境值[名称];
    }
  }
  return undefined;
}

function 获取环境配置快照(环境值 = {}) {
  const 映射 = {
    wk: ['wk', 'WK'],
    ev: ['ev', 'EV'],
    ech: ['ech', 'ECH'],
    customDNS: ['customDNS', 'CUSTOMDNS', 'CUSTOM_DNS'],
    customECHDomain: ['customECHDomain', 'CUSTOMECHDOMAIN', 'CUSTOM_ECH_DOMAIN'],
    alpn: ['alpn', 'ALPN'],
    d: ['d', 'D'],
    p: ['p', 'P'],
    yx: ['yx', 'YX'],
    yxURL: ['yxURL', 'YXURL', 'YX_URL'],
    s: ['s', 'S'],
    ena: ['ena', 'ENA'],
    epd: ['epd', 'EPD'],
    epi: ['epi', 'EPI'],
    egi: ['egi', 'EGI'],
    ae: ['ae', 'AE'],
    rm: ['rm', 'RM'],
    qj: ['qj', 'QJ'],
    dkby: ['dkby', 'DKBY'],
    yxby: ['yxby', 'YXBY'],
    ipv4: ['ipv4', 'IPV4'],
    ipv6: ['ipv6', 'IPV6'],
    ispMobile: ['ispMobile', 'ISPMOBILE', 'ISP_MOBILE'],
    ispUnicom: ['ispUnicom', 'ISPUNICOM', 'ISP_UNICOM'],
    ispTelecom: ['ispTelecom', 'ISPTELECOM', 'ISP_TELECOM']
  };
  const 快照 = {};
  for (const [键, 名称列表] of Object.entries(映射)) {
    const 值 = 读取环境配置值(环境值, ...名称列表);
    if (值 !== undefined) 快照[键] = 值;
  }
  return 快照;
}

function 获取有效配置快照(环境值 = {}) {
  return 整理有效配置({
    ...获取环境配置快照(环境值),
    ...键值配置
  });
}
const 地区映射 = {
  'HK': ['🇭🇰 香港', 'HK', 'Hong Kong'],
  'US': ['🇺🇸 美国', 'US', 'United States'],
  'SG': ['🇸🇬 新加坡', 'SG', 'Singapore'],
  'JP': ['🇯🇵 日本', 'JP', 'Japan'],
  'KR': ['🇰🇷 韩国', 'KR', 'South Korea'],
  'DE': ['🇩🇪 德国', 'DE', 'Germany'],
  'SE': ['🇸🇪 瑞典', 'SE', 'Sweden'],
  'NL': ['🇳🇱 荷兰', 'NL', 'Netherlands'],
  'FI': ['🇫🇮 芬兰', 'FI', 'Finland'],
  'GB': ['🇬🇧 英国', 'GB', 'United Kingdom'],
  'Oracle': ['甲骨文', 'Oracle'],
  'DigitalOcean': ['数码海', 'DigitalOcean'],
  'Vultr': ['Vultr', 'Vultr'],
  'Multacom': ['Multacom', 'Multacom']
};
// 官方直连地址池：内置实测可用地址，不依赖任何第三方域名
// CF 是任播，同一地址在不同位置落到的机房不同，所以不按地区区分
const 官方直连地址 = 解码64('MTcyLjcxLjIxOC4xOTAsMTYyLjE1OC4yMjguODcsMTYyLjE1OC4xODkuMTM0LDE2Mi4xNTguMjYuNjMsMTYyLjE1OC4yNS44NiwxNjIuMTU4LjI5LjIxNiwxNjIuMTU4LjIxOC4xNjAsMTYyLjE1OC4yMjcuMjE0LDE3Mi42OS4xMTguMTk4LDE3Mi42OS4xMTkuMTUw').split(',');
function 取官方直连地址() {
  const 命中 = 官方直连地址[Math.floor(Math.random() * 官方直连地址.length)];
  return {
    domain: 命中,
    region: 'CF',
    regionCode: 'CF',
    port: 443
  };
}
let 备用地址列表 = [];
const 直连域名列表 = [{
  name: "cloudflare.182682.xyz",
  domain: "cloudflare.182682.xyz"
}, {
  name: "speed.marisalnc.com",
  domain: "speed.marisalnc.com"
}, {
  domain: "freeyx.cloudflare88.eu.org"
}, {
  domain: "bestcf.top"
}, {
  domain: "cdn.2020111.xyz"
}, {
  domain: "cfip.cfcdn.vip"
}, {
  domain: "cf.0sm.com"
}, {
  domain: "cf.090227.xyz"
}, {
  domain: "cf.zhetengsha.eu.org"
}, {
  domain: "cloudflare.9jy.cc"
}, {
  domain: "cf.zerone-cdn.pp.ua"
}, {
  domain: "cfip.1323123.xyz"
}, {
  domain: "cnamefuckxxs.yuchen.icu"
}, {
  domain: "cloudflare-ip.mofashi.ltd"
}, {
  domain: "115155.xyz"
}, {
  domain: "cname.xirancdn.us"
}, {
  domain: "f3058171cad.002404.xyz"
}, {
  domain: "8.889288.xyz"
}, {
  domain: "cdn.tzpro.xyz"
}, {
  domain: "cf.877771.xyz"
}, {
  domain: "xn--b6gac.eu.org"
}];
const 错误_无效数据 = atob('aW52YWxpZCBkYXRh');
const 错误_无效用户 = atob('aW52YWxpZCB1c2Vy');
const 错误_不支持命令 = atob('Y29tbWFuZCBpcyBub3Qgc3VwcG9ydGVk');
const 错误_仅支持域名系统用户数据报 = atob('VURQIHByb3h5IG9ubHkgZW5hYmxlIGZvciBETlMgd2hpY2ggaXMgcG9ydCA1Mw==');
const 错误_无效地址类型 = atob('aW52YWxpZCBhZGRyZXNzVHlwZQ==');
const 错误_空地址 = atob('YWRkcmVzc1ZhbHVlIGlzIGVtcHR5');
const 错误_网页套接字未打开 = atob('d2ViU29ja2V0LmVhZHlTdGF0ZSBpcyBub3Qgb3Blbg==');
const 错误_无效标识字符串 = atob('U3RyaW5naWZpZWQgaWRlbnRpZmllciBpcyBpbnZhbGlk');
const 错误_无效代理地址 = atob('SW52YWxpZCBTT0NLUyBhZGRyZXNzIGZvcm1hdA==');
const 错误_代理无可用方法 = atob('bm8gYWNjZXB0YWJsZSBtZXRob2Rz');
const 错误_代理需要认证 = atob('c29ja3Mgc2VydmVyIG5lZWRzIGF1dGg=');
const 错误_代理认证失败 = atob('ZmFpbCB0byBhdXRoIHNvY2tzIHNlcnZlcg==');
const 错误_代理连接失败 = atob('ZmFpbCB0byBvcGVuIHNvY2tzIGNvbm5lY3Rpb24=');
const 错误_代理隧道失败 = atob('ZmFpbCB0byBvcGVuIHByb3h5IHR1bm5lbA==');
const 错误_代理响应异常 = atob('aW52YWxpZCBwcm94eSByZXNwb25zZQ==');
const 前缀_套接字5 = atob('c29ja3M1Oi8v');
const 前缀_套接字 = atob('c29ja3M6Ly8=');
const 前缀_超文本 = atob('aHR0cDovLw==');
const 前缀_安全超文本 = atob('aHR0cHM6Ly8=');
const 文本_连接方法 = atob('Q09OTkVDVA==');
const 文本_协议版本 = atob('IEhUVFAvMS4x');
const 文本_主机头 = atob('SG9zdDog');
const 文本_代理认证头 = atob('UHJveHktQXV0aG9yaXphdGlvbjogQmFzaWMg');
const 文本_代理保持 = atob('UHJveHktQ29ubmVjdGlvbjogS2VlcC1BbGl2ZQ==');
const 文本_用户代理头 = atob('VXNlci1BZ2VudDogTW96aWxsYS81LjA=');
const 文本_换行 = atob('DQo=');
const 文本_响应前缀 = atob('SFRUUC8=');
const 代理种类_套接字5 = 'p5';
const 代理种类_隧道 = 'pt';
const 代理种类_安全隧道 = 'pts';
let 已解析代理5配置 = {};
let 是否代理已启用 = false;
const 地址类型_四版 = 1;
const 地址类型_网址 = 2;
const 地址类型_六版 = 3;
const 传输块大小 = 64 * 1024;
const 传输下载包大小 = 32 * 1024;
const 传输下载尾部 = 512;
const 传输下载延迟 = 0;
const 传输上传包大小 = 16 * 1024;
const 传输上传队列上限 = 256 * 1024;
const 传输连接竞速数 = 1;
const 首字节超时 = 1200;
const 共享解码器 = new TextDecoder();
const 唯一标识字节缓存 = new Map();
const 用户UUID正则 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IPv4正则 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPv6正则 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
const IPv6压缩正则 = /^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;

function 是否有效格式(字符串) {
  return 用户UUID正则.test(字符串);
}
function 是否有效地址(地址792) {
  return IPv4正则.test(地址792) || IPv6正则.test(地址792) || IPv6压缩正则.test(地址792);
}
function 创建节点命名器(跳过 = false) {
  // 如果配置了 yxURL，则跳过编号
  const 值跳过 = typeof 优选地址源 !== 'undefined' && 优选地址源 && 优选地址源.trim();
  let 跳过编号791 = 值跳过 || 跳过;
  const 计数器组790 = {};
  function 设置跳过编号(本地值789) {
    if (!值跳过) {
      跳过编号791 = 本地值789;
    }
  }
  function 处理命名器(基础名称, 节点名称788 = null) {
    if (跳过编号791 || 基础名称 && 基础名称.includes('.')) {
      return 节点名称788 || 基础名称;
    }
    if (!计数器组790[基础名称]) 计数器组790[基础名称] = 0;
    计数器组790[基础名称]++;
    const 索引787 = String(计数器组790[基础名称]).padStart(2, '0');
    return `${节点名称788 || 基础名称}-${索引787}`;
  }
  return {
    namer: 处理命名器,
    setSkipNumbering: 设置跳过编号
  };
}
function 规范化节点主机(主机786) {
  return String(主机786 || '').trim().replace(/^\[([^\]]+)\]$/, '$1');
}
function 处理值节点别名部分(值785, 回退 = 'Node') {
  let 文本784 = String(值785 || '').trim();
  if (!文本784 || /^自定义优选-/i.test(文本784)) 文本784 = 回退;
  文本784 = 文本784.replace(/^\[([^\]]+)\]$/, '$1').replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '').replace(/\s+/g, '_');
  return 文本784 || 回退;
}
function 获取值节点别名基础(项目783) {
  const 主机782 = 规范化节点主机(项目783?.ip || 项目783?.domain || '');
  if (主机782 && 主机782.includes(':') && /^[0-9a-fA-F:.]+$/.test(主机782)) return 'IPv6优选';
  if (主机782 && !是否有效地址(主机782)) return '优选域名';
  const 本地值781 = 处理值节点别名部分(项目783?.isp || 项目783?.name || '', 'IPv4优选');
  const 机房780 = 处理值节点别名部分(项目783?.colo || '', '');
  return 机房780 ? `${本地值781}-${机房780}` : 本地值781;
}
function 创建值节点命名器(跳过编号779 = false) {
  const 计数器组 = {};
  return 项目778 => {
    const 基础 = 获取值节点别名基础(项目778);
    if (跳过编号779) return 基础;
    计数器组[基础] = (计数器组[基础] || 0) + 1;
    return `${基础}-${String(计数器组[基础]).padStart(2, '0')}`;
  };
}
function 规范化应用层协议协商(值777) {
  const 本地值776 = ['', 'h3', 'h2', 'http/1.1', 'h3,h2', 'h2,http/1.1', 'h3,h2,http/1.1'];
  const 应用层协议协商775 = String(值777 || '').trim();
  return 本地值776.includes(应用层协议协商775) ? 应用层协议协商775 : '';
}
function 处理值应用层协议协商值(参数774) {
  const 应用层协议协商 = 规范化应用层协议协商(自定义应用层协议协商);
  if (应用层协议协商) 参数774.set('alpn', 应用层协议协商);
}
async function 处理值键值值(本地值773) {
  const 键值绑定 = 本地值773.C || 本地值773.c;
  if (键值绑定) {
    try {
      键值存储 = 键值绑定;
      await 加载键值配置();
    } catch (错误772) {
      键值存储 = null;
    }
  } else {}
}
async function 加载键值配置(本地值771 = false) {
  if (!键值存储) {
    return;
  }

  // 短窗口内完全信任缓存，避免高频请求时打爆 KV
  if (!本地值771 && 键值配置上次加载 > 0 && Date.now() - 键值配置上次加载 < 键值缓存期限) {
    return;
  }
  try {
    // 读取小体积的版本键 c_ver（约 13B），用于跨 isolate 缓存失效
    let 本地值770 = '';
    try {
      本地值770 = (await 键值存储.get('c_ver')) || '';
    } catch (忽略值769) {}

    // 版本未变化且已有缓存，仅刷新时间戳，跳过完整读取
    if (!本地值771 && 本地值770 && 本地值770 === 键值配置版本 && 键值配置 && Object.keys(键值配置).length > 0) {
      键值配置上次加载 = Date.now();
      return;
    }
    const 配置数据 = await 键值存储.get('c');
    if (配置数据) {
      键值配置 = JSON.parse(配置数据);
    }
    键值配置版本 = 本地值770;
    键值配置上次加载 = Date.now();
  } catch (错误768) {
    // 读取失败时保留现有缓存，避免临时故障导致配置丢失
    if (!键值配置) 键值配置 = {};
  }
}
async function 保存键值配置() {
  if (!键值存储) {
    return;
  }
  try {
    const 配置字符串 = JSON.stringify(键值配置);
    await 键值存储.put('c', 配置字符串);
    // 写入版本号，让其它 isolate 在下次请求时能立即看到变更
    const 新值 = String(Date.now());
    键值配置版本 = 新值;
    try {
      await 键值存储.put('c_ver', 新值);
    } catch (忽略值767) {}
    键值配置上次加载 = Date.now();
  } catch (错误766) {
    throw 错误766;
  }
}
function 获取配置值(键765, 默认值 = '') {
  if (键值配置[键765] !== undefined) {
    return 键值配置[键765];
  }
  return 默认值;
}
async function 设置配置值(键764, 值763) {
  键值配置[键764] = 值763;
  await 保存键值配置();
}
async function 检查地址可用性(域名760, 端口759 = 443, 超时758 = 2000) {
  try {
    const 控制器757 = new AbortController();
    const 超时标识756 = setTimeout(() => 控制器757.abort(), 超时758);
    const 响应755 = await fetch(`https://${域名760}`, {
      method: 'HEAD',
      signal: 控制器757.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CF-IP-Checker/1.0)'
      }
    });
    clearTimeout(超时标识756);
    return 响应755.status < 500;
  } catch (错误754) {
    return true;
  }
}
async function 获取值备用地址(工作器地区753 = '', 值地区匹配752 = 启用地区匹配) {
  // 没指定地区（wk 留空=官方直连）时走内置地址，不依赖第三方域名
  if (!工作器地区753 || 工作器地区753 === 'CF') {
    return 取官方直连地址();
  }
  if (备用地址列表.length === 0) {
    return 取官方直连地址();
  }
  const 可用地址列表751 = 备用地址列表.map(地址750 => ({
    ...地址750,
    available: true
  }));
  if (值地区匹配752 && 工作器地区753) {
    const 值地址列表749 = 获取值地区值(工作器地区753, 可用地址列表751, 值地区匹配752);
    if (值地址列表749.length > 0) {
      const 已选地址748 = 值地址列表749[0];
      return 已选地址748;
    }
  }
  const 已选地址 = 可用地址列表751[0];
  return 已选地址;
}
function 获取值值(地区747) {
  const 值映射 = {
    'US': ['SG', 'JP', 'KR'],
    'SG': ['JP', 'KR', 'US'],
    'JP': ['SG', 'KR', 'US'],
    'KR': ['JP', 'SG', 'US'],
    'DE': ['NL', 'GB', 'SE', 'FI'],
    'SE': ['DE', 'NL', 'FI', 'GB'],
    'NL': ['DE', 'GB', 'SE', 'FI'],
    'FI': ['SE', 'DE', 'NL', 'GB'],
    'GB': ['DE', 'NL', 'SE', 'FI']
  };
  return 值映射[地区747] || [];
}
function 获取值值值值(地区746) {
  const 值值745 = 获取值值(地区746);
  const 值值744 = ['US', 'SG', 'JP', 'KR', 'DE', 'SE', 'NL', 'FI', 'GB'];
  return [地区746, ...值值745, ...值值744.filter(结果值743 => 结果值743 !== 地区746 && !值值745.includes(结果值743))];
}
function 获取值地区值(工作器地区, 可用地址列表, 值地区匹配 = 启用地区匹配) {
  if (!值地区匹配 || !工作器地区) {
    return 可用地址列表;
  }
  const 值值742 = 获取值值值值(工作器地区);
  const 值地址列表741 = [];
  for (const 地区 of 值值742) {
    const 地区地址列表 = 可用地址列表.filter(地址740 => 地址740.regionCode === 地区);
    值地址列表741.push(...地区地址列表);
  }
  return 值地址列表741;
}
function 解析地址值端口(输入) {
  if (输入.includes('[') && 输入.includes(']')) {
    const 本地值739 = 输入.match(/^\[([^\]]+)\](?::(\d+))?$/);
    if (本地值739) {
      return {
        address: 本地值739[1],
        port: 本地值739[2] ? parseInt(本地值739[2], 10) : null
      };
    }
  }
  const 值值索引738 = 输入.lastIndexOf(':');
  if (值值索引738 > 0) {
    const 地址737 = 输入.substring(0, 值值索引738);
    const 端口字符串 = 输入.substring(值值索引738 + 1);
    const 端口736 = parseInt(端口字符串, 10);

    // address 含 ':' 说明是裸 IPv6（如 2001:db8::1），整体当地址，无端口
    if (!地址737.includes(':') && !isNaN(端口736) && 端口736 > 0 && 端口736 <= 65535) {
      return {
        address: 地址737,
        port: 端口736
      };
    }
  }
  return {
    address: 输入,
    port: null
  };
}
export default {
  async fetch(请求735, 本地值734, 本地值733) {
    try {
      const 是否网页套接字 = 请求735.headers.get('Upgrade') === 'websocket';
      const 是否值732 = 请求735.method === 'POST';
      const 请求网址731 = new URL(请求735.url);
      const 路径值730 = 请求网址731.pathname.split('/').filter(参数值729 => 参数值729);
      if (!是否网页套接字 && !是否值732 && 请求网址731.pathname !== '/') {
        const 值值728 = (本地值734.u || 本地值734.U || '').toLowerCase();
        const 值值727 = (本地值734.d || 本地值734.D || '').toLowerCase();
        const 首次值 = 路径值730[0] || '';
        const 清理值 = 值值727.startsWith('/') ? 值值727.substring(1) : 值值727;
        if (首次值 !== 值值728 && (清理值 ? 首次值 !== 清理值 : false)) {
          return new Response('Not Found', {
            status: 404
          });
        }
      }
      await 处理值键值值(本地值734);
      认证令牌 = (本地值734.u || 本地值734.U || 认证令牌).toLowerCase();
      const 值路径 = (本地值734.d || 本地值734.D || 认证令牌).toLowerCase();
      const 本地值726 = 获取配置值('p', 本地值734.p || 本地值734.P);
      let 值自定义地址 = false;
      const 手动地区725 = 获取配置值('wk', 本地值734.wk || 本地值734.WK);
      if (手动地区725 && 手动地区725.trim()) {
        手动工作器地区 = 手动地区725.trim().toUpperCase();
        当前工作器地区 = 手动工作器地区;
      } else if (本地值726 && 本地值726.trim()) {
        值自定义地址 = true;
        当前工作器地区 = 'CUSTOM';
      } else {
        // wk 留空 = 官方直连：直接用内置地址，不再探测地区去匹配第三方域名
        当前工作器地区 = 'CF';
      }
      const 地区匹配控制724 = 获取配置文本值('rm', 配置默认值.rm, 本地值734.rm || 本地值734.RM);
      启用地区匹配 = !(地区匹配控制724 && 地区匹配控制724.toLowerCase() === 'no');
      const 值回退723 = 获取配置文本值('p', 配置默认值.p, 本地值734.p || 本地值734.P);
      回退地址 = 值回退723 ? 值回退723.trim() : '';
      代理5配置 = 获取配置文本值('s', 配置默认值.s, 本地值734.s || 本地值734.S);
      if (代理5配置) {
        try {
          已解析代理5配置 = 解析代理配置(代理5配置);
          是否代理已启用 = true;
        } catch (错误722) {
          是否代理已启用 = false;
        }
      } else {
        已解析代理5配置 = {};
        是否代理已启用 = false;
      }
      const 自定义优选 = 获取配置值('yx', 本地值734.yx || 本地值734.YX);
      if (自定义优选) {
        try {
          const 优选列表721 = 自定义优选.split(',').map(项目720 => 项目720.trim()).filter(项目719 => 项目719);
          自定义优选地址列表 = [];
          自定义优选域名列表 = [];
          优选列表721.forEach(项目718 => {
            let 节点名称717 = '';
            let 地址部分716 = 项目718;
            if (项目718.includes('#')) {
              const 部分列表715 = 项目718.split('#');
              地址部分716 = 部分列表715[0].trim();
              节点名称717 = 部分列表715[1].trim();
            }
            const {
              address: 地址714,
              port: 端口713
            } = 解析地址值端口(地址部分716);
            if (!节点名称717) {
              节点名称717 = '自定义优选-' + 地址714 + (端口713 ? ':' + 端口713 : '');
            }
            if (是否有效地址(地址714)) {
              自定义优选地址列表.push({
                ip: 地址714,
                port: 端口713,
                isp: 节点名称717
              });
            } else {
              自定义优选域名列表.push({
                domain: 地址714,
                port: 端口713,
                name: 节点名称717
              });
            }
          });
        } catch (错误712) {
          自定义优选地址列表 = [];
          自定义优选域名列表 = [];
        }
      }
      const 值控制711 = 获取配置文本值('qj', 配置默认值.qj, 本地值734.qj || 本地值734.QJ);
      const 值控制711值 = (值控制711 || '').toLowerCase();
      启用代理降级 = 值控制711值 === 'no';
      仅走代理 = 值控制711值 === 'only';
      const 值控制710 = 获取配置文本值('dkby', 配置默认值.dkby, 本地值734.dkby || 本地值734.DKBY);
      禁用非传输层安全 = !!(值控制710 && 值控制710.toLowerCase() === 'yes');
      const 值控制709 = 获取配置文本值('yxby', 配置默认值.yxby, 本地值734.yxby || 本地值734.YXBY);
      禁用优选 = !!(值控制709 && 值控制709.toLowerCase() === 'yes');
      启用明文 = 获取配置开关值('ev', true, 本地值734.ev);
      启用优选域名 = 获取配置开关值('epd', true, 本地值734.epd || 本地值734.EPD);
      启用优选地址 = 获取配置开关值('epi', true, 本地值734.epi || 本地值734.EPI);
      启用仓库优选 = 获取配置开关值('egi', true, 本地值734.egi || 本地值734.EGI);
      启用原生地址 = 获取配置开关值('ena', false, 本地值734.ena || 本地值734.ENA);
      启用加密客户端问候 = 获取配置开关值('ech', false, 本地值734.ech || 本地值734.ECH);

      // 加载自定义DNS和ECH域名配置
      自定义域名系统 = 获取配置文本值('customDNS', 配置默认值.customDNS).trim() || 配置默认值.customDNS;
      自定义加密客户端问候域名 = 获取配置文本值('customECHDomain', 配置默认值.customECHDomain).trim() || 配置默认值.customECHDomain;
      自定义应用层协议协商 = 规范化应用层协议协商(获取配置文本值('alpn', 配置默认值.alpn, 本地值734.alpn || 本地值734.ALPN));

      // 如果启用了ECH，自动启用仅TLS模式（避免80端口干扰）
      // ECH需要TLS才能工作，所以必须禁用非TLS节点
      if (启用加密客户端问候) {
        禁用非传输层安全 = true;
        // 检查 KV 中是否有 dkby: yes，没有就直接写入
        const 当前值 = 获取配置值('dkby', '');
        if (当前值 !== 'yes') {
          await 设置配置值('dkby', 'yes');
        }
      }
      if (!启用明文) {
        启用明文 = true;
      }
      优选地址源 = 获取配置文本值('yxURL', 配置默认值.yxURL, 本地值734.yxURL || 本地值734.YXURL);
      自定义路径 = 获取配置文本值('d', 配置默认值.d, 本地值734.d || 本地值734.D);
      const 网址698 = new URL(请求735.url);
      if (网址698.pathname.includes('/api/config')) {
        const 路径部分列表697 = 网址698.pathname.split('/').filter(参数值696 => 参数值696);
        const 接口索引695 = 路径部分列表697.indexOf('api');
        if (接口索引695 > 0) {
          const 路径值694 = 路径部分列表697.slice(0, 接口索引695);
          const 路径值693 = 路径值694.join('/');
          let 是否有效692 = false;
          if (自定义路径 && 自定义路径.trim()) {
            const 清理自定义路径691 = 自定义路径.trim().startsWith('/') ? 自定义路径.trim().substring(1) : 自定义路径.trim();
            是否有效692 = 路径值693 === 清理自定义路径691;
          } else {
            是否有效692 = 是否有效格式(路径值693) && 路径值693 === 认证令牌;
          }
          if (是否有效692) {
            return await 处理配置接口(请求735, 本地值734);
          } else {
            return new Response(JSON.stringify({
              error: '路径验证失败'
            }), {
              status: 403,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
        }
        return new Response(JSON.stringify({
          error: '无效的API路径'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      if (网址698.pathname.includes('/api/preferred-ips')) {
        const 路径部分列表690 = 网址698.pathname.split('/').filter(参数值689 => 参数值689);
        const 接口索引 = 路径部分列表690.indexOf('api');
        if (接口索引 > 0) {
          const 路径值688 = 路径部分列表690.slice(0, 接口索引);
          const 路径值687 = 路径值688.join('/');
          let 是否有效686 = false;
          if (自定义路径 && 自定义路径.trim()) {
            const 清理自定义路径685 = 自定义路径.trim().startsWith('/') ? 自定义路径.trim().substring(1) : 自定义路径.trim();
            是否有效686 = 路径值687 === 清理自定义路径685;
          } else {
            是否有效686 = 是否有效格式(路径值687) && 路径值687 === 认证令牌;
          }
          if (是否有效686) {
            return await 处理优选地址列表接口(请求735);
          } else {
            return new Response(JSON.stringify({
              error: '路径验证失败'
            }), {
              status: 403,
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
        }
        return new Response(JSON.stringify({
          error: '无效的API路径'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      if (请求735.headers.get('Upgrade') === 'websocket') {
        return await 处理网页套接字请求(请求735);
      }
      if (请求735.method === 'GET') {
        if (网址698.pathname === '/') {
          // 优先检查Cookie中的语言设置
          const 凭据头部669 = 请求735.headers.get('Cookie') || '';
          let 语言来源凭据668 = null;
          if (凭据头部669) {
            const 本地值667 = 凭据头部669.split(';').map(丙值666 => 丙值666.trim());
            for (const 凭据665 of 本地值667) {
              if (凭据665.startsWith('preferredLanguage=')) {
                语言来源凭据668 = 凭据665.split('=')[1];
                break;
              }
            }
          }
          let 是否值664 = false;
          if (语言来源凭据668 === 'fa' || 语言来源凭据668 === 'fa-IR') {
            是否值664 = true;
          } else if (语言来源凭据668 === 'zh' || 语言来源凭据668 === 'zh-CN') {
            是否值664 = false;
          } else {
            // 如果没有Cookie，使用浏览器语言检测
            const 接受语言663 = 请求735.headers.get('Accept-Language') || '';
            const 浏览器语言662 = 接受语言663.split(',')[0].split('-')[0].toLowerCase();
            是否值664 = 浏览器语言662 === 'fa' || 接受语言663.includes('fa-IR') || 接受语言663.includes('fa');
          }
          const 语言 = 是否值664 ? 'fa' : 'zh-CN';
          const 语言值661 = 是否值664 ? 'fa-IR' : 'zh-CN';
          const 本地值660 = {
            zh: {
              title: '终端 v3.0',
              terminal: '终端 v3.0',
              congratulations: '恭喜你来到这',
              enterU: '请输入你U变量的值',
              enterD: '请输入你D变量的值',
              command: '命令: connect [',
              uuid: 'UUID',
              path: 'PATH',
              inputU: '输入U变量的内容并且回车...',
              inputD: '输入D变量的内容并且回车...',
              connecting: '正在连接...',
              invading: '正在入侵...',
              success: '连接成功！返回结果...',
              error: '错误: 无效的UUID格式',
              reenter: '请重新输入有效的UUID'
            },
            fa: {
              title: 'ترمینال v3.0',
              terminal: 'ترمینال v3.0',
              congratulations: 'تبریک می‌گوییم به شما',
              enterU: 'لطفا مقدار متغیر U خود را وارد کنید',
              enterD: 'لطفا مقدار متغیر D خود را وارد کنید',
              command: 'دستور: connect [',
              uuid: 'UUID',
              path: 'PATH',
              inputU: 'محتویات متغیر U را وارد کرده و Enter را بزنید...',
              inputD: 'محتویات متغیر D را وارد کرده و Enter را بزنید...',
              connecting: 'در حال اتصال...',
              invading: 'در حال نفوذ...',
              success: 'اتصال موفق! در حال بازگشت نتیجه...',
              error: 'خطا: فرمت UUID نامعتبر',
              reenter: 'لطفا UUID معتبر را دوباره وارد کنید'
            }
          };
          const 翻译值659 = 本地值660[是否值664 ? 'fa' : 'zh'];
          const 终端页面 = `<!DOCTYPE html>
<html lang="${语言值661}" dir="${是否值664 ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${翻译值659.title}</title>
    <style>
        :root {
            --bg: #090d16;
            --card-bg: #0f172a;
            --border: rgba(255, 255, 255, 0.1);
            --primary: #6366f1;
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --success: #10b981;
            --error: #ef4444;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg);
            background-image: radial-gradient(circle at 50% 10%, rgba(99, 102, 241, 0.12) 0%, transparent 60%);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .cp-lang-wrapper {
            position: fixed;
            top: 20px;
            right: 24px;
            z-index: 100;
        }
        #languageSelector {
            background: #1e293b;
            border: 1px solid var(--border);
            color: var(--text);
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            outline: none;
            transition: all 0.2s;
        }
        #languageSelector:hover {
            border-color: var(--primary);
        }
        .terminal {
            width: 100%;
            max-width: 680px;
            height: 480px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .terminal-header {
            background: #1e293b;
            padding: 12px 18px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .terminal-buttons {
            display: flex;
            gap: 8px;
        }
        .terminal-button {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff5f56;
        }
        .terminal-button:nth-child(2) { background: #ffbd2e; }
        .terminal-button:nth-child(3) { background: #27c93f; }
        .terminal-title {
            color: var(--text-dim);
            font-size: 13px;
            font-weight: 600;
            font-family: "JetBrains Mono", Consolas, monospace;
            letter-spacing: 0.05em;
        }
        .terminal-body {
            padding: 24px;
            flex: 1;
            overflow-y: auto;
            font-family: "JetBrains Mono", Consolas, monospace;
            font-size: 14px;
            line-height: 1.7;
            background: #090d16;
        }
        .terminal-body::-webkit-scrollbar { width: 6px; }
        .terminal-body::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .terminal-line {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .terminal-prompt {
            color: var(--primary);
            font-weight: 600;
        }
        .terminal-input {
            background: transparent;
            border: none;
            outline: none;
            color: #a5b4fc;
            font-family: inherit;
            font-size: 14px;
            flex: 1;
            min-width: 0;
            caret-color: var(--primary);
        }
        .terminal-input::placeholder {
            color: #475569;
        }
        .terminal-cursor {
            display: inline-block;
            width: 8px;
            height: 16px;
            background: var(--primary);
            margin-left: 2px;
            animation: cp-blink 1s steps(2, end) infinite;
        }
        @keyframes cp-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
        .terminal-output { color: #e2e8f0; }
        .terminal-error  { color: var(--error); }
        .terminal-success{ color: var(--success); }
    </style>
</head>
<body>
    <div class="cp-lang-wrapper">
        <select id="languageSelector" onchange="切换语言(this.value)">
            <option value="zh" ${!是否值664 ? 'selected' : ''}>🇨🇳 中文</option>
            <option value="fa" ${是否值664 ? 'selected' : ''}>🇮🇷 فارسی</option>
        </select>
    </div>
    <div class="terminal">
        <div class="terminal-header">
            <div class="terminal-buttons">
                <div class="terminal-button"></div>
                <div class="terminal-button"></div>
                <div class="terminal-button"></div>
            </div>
            <div class="terminal-title">${翻译值659.terminal}</div>
        </div>
        <div class="terminal-body" id="terminalBody">
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">${翻译值659.congratulations}</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">${自定义路径 && 自定义路径.trim() ? 翻译值659.enterD : 翻译值659.enterU}</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">${翻译值659.command}${自定义路径 && 自定义路径.trim() ? 翻译值659.path : 翻译值659.uuid}]</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <input type="text" class="terminal-input" id="uuidInput" placeholder="${自定义路径 && 自定义路径.trim() ? 翻译值659.inputD : 翻译值659.inputU}" autofocus>
                <span class="terminal-cursor"></span>
            </div>
        </div>
    </div>
    <script>
    window.应用页面特效 = function() {};
    window.切换页面特效 = function() {};
    function 创建矩阵雨() {}
    function 是否有效唯一标识(唯一标识) {
      const 唯一标识正则 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return 唯一标识正则.test(唯一标识);
    }
    function 添加终端行(内容, 类型 = 'output') {
      const 终端主体 = document.getElementById('terminalBody');
      const 行 = document.createElement('div');
      行.className = 'terminal-line';
      const 提示符 = document.createElement('span');
      提示符.className = 'terminal-prompt';
      提示符.textContent = 'root:~$';
      const 输出 = document.createElement('span');
      输出.className = 'terminal-' + 类型;
      输出.textContent = 内容;
      行.appendChild(提示符);
      行.appendChild(输出);
      终端主体.appendChild(行);
      终端主体.scrollTop = 终端主体.scrollHeight;
    }
    function 处理唯一标识输入() {
      const 输入 = document.getElementById('uuidInput');
      const 输入值 = 输入.value.trim();
      const 自定义路径 = '${自定义路径}';
      if (输入值) {
        添加终端行(atob('Y29ubmVjdCA=') + 输入值, 'output');
        const 本地值 = {
          zh: {
            connecting: '正在连接...',
            invading: '正在验证...',
            success: '连接成功！正在跳转...',
            error: '错误: 无效的格式',
            reenter: '请重新输入有效内容'
          },
          fa: {
            connecting: 'در حال اتصال...',
            invading: 'در حال اعتبارسنجی...',
            success: 'اتصال موفق! در حال انتقال...',
            error: 'خطا: فرمت نامعتبر',
            reenter: 'لطفا مقدار معتبر را دوباره وارد کنید'
          }
        };
        const 浏览器语言 = navigator.language || navigator.userLanguage || '';
        const 是否值 = 浏览器语言.includes('fa') || 浏览器语言.includes('fa-IR');
        const 翻译值 = 本地值[是否值 ? 'fa' : 'zh'];
        if (自定义路径) {
          const 清理输入 = 输入值.startsWith('/') ? 输入值 : '/' + 输入值;
          添加终端行(翻译值.connecting, 'output');
          setTimeout(() => {
            添加终端行(翻译值.success, 'success');
            setTimeout(() => {
              window.location.href = 清理输入;
            }, 500);
          }, 400);
        } else {
          if (是否有效唯一标识(输入值)) {
            添加终端行(翻译值.invading, 'output');
            setTimeout(() => {
              添加终端行(翻译值.success, 'success');
              setTimeout(() => {
                window.location.href = '/' + 输入值;
              }, 500);
            }, 400);
          } else {
            添加终端行(翻译值.error, 'error');
            添加终端行(翻译值.reenter, 'output');
          }
        }
        输入.value = '';
      }
    }
    function 切换语言(语言) {
      localStorage.setItem('preferredLanguage', 语言);
      const 过期日期 = new Date();
      过期日期.setFullYear(过期日期.getFullYear() + 1);
      document.cookie = 'preferredLanguage=' + 语言 + '; path=/; expires=' + 过期日期.toUTCString() + '; SameSite=Lax';
      window.location.reload();
    }
    document.addEventListener('DOMContentLoaded', function() {
      const 输入 = document.getElementById('uuidInput');
      if (输入) {
        输入.focus();
        输入.addEventListener('keypress', function (e) {
          if (e.key === 'Enter') 处理唯一标识输入();
        });
      }
    });
    </script>
</body>
</html>`;
          return new Response(终端页面, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8'
            }
          });
        }
        if (自定义路径 && 自定义路径.trim()) {
          const 清理自定义路径 = 自定义路径.trim().startsWith('/') ? 自定义路径.trim() : '/' + 自定义路径.trim();
          const 规范化自定义路径 = 清理自定义路径.endsWith('/') && 清理自定义路径.length > 1 ? 清理自定义路径.slice(0, -1) : 清理自定义路径;
          const 规范化路径 = 网址698.pathname.endsWith('/') && 网址698.pathname.length > 1 ? 网址698.pathname.slice(0, -1) : 网址698.pathname;
          if (规范化路径 === 规范化自定义路径) {
            return await 处理订阅值(请求735, 认证令牌);
          }
          if (规范化路径 === 规范化自定义路径 + '/sub') {
            return await 处理订阅请求(请求735, 认证令牌, 网址698);
          }
          if (网址698.pathname.length > 1 && 网址698.pathname !== '/') {
            const 用户658 = 网址698.pathname.replace(/\/$/, '').replace('/sub', '').substring(1);
            if (是否有效格式(用户658)) {
              return new Response(JSON.stringify({
                error: '访问被拒绝',
                message: '当前 Worker 已启用自定义路径模式，UUID 访问已禁用'
              }), {
                status: 403,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }
          }
        } else {
          if (网址698.pathname.length > 1 && 网址698.pathname !== '/' && !网址698.pathname.includes('/sub')) {
            const 用户657 = 网址698.pathname.replace(/\/$/, '').substring(1);
            if (是否有效格式(用户657)) {
              if (用户657 === 认证令牌) {
                return await 处理订阅值(请求735, 用户657);
              } else {
                return new Response(JSON.stringify({
                  error: 'UUID错误 请注意变量名称是u不是uuid'
                }), {
                  status: 403,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              }
            }
          }
          if (网址698.pathname.includes('/sub')) {
            const 路径部分列表 = 网址698.pathname.split('/');
            if (路径部分列表.length === 2 && 路径部分列表[1] === 'sub') {
              const 用户656 = 路径部分列表[0].substring(1);
              if (是否有效格式(用户656)) {
                if (用户656 === 认证令牌) {
                  return await 处理订阅请求(请求735, 用户656, 网址698);
                } else {
                  return new Response(JSON.stringify({
                    error: 'UUID错误'
                  }), {
                    status: 403,
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });
                }
              }
            }
          }
        }
        if (网址698.pathname.toLowerCase().includes(`/${值路径}`)) {
          return await 处理订阅请求(请求735, 认证令牌);
        }
      }
      return new Response(JSON.stringify({
        error: 'Not Found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (错误655) {
      return new Response(错误655.toString(), {
        status: 500
      });
    }
  }
};
function 生成值配置654(链接列表653) {
  return btoa(链接列表653.join('\n'));
}

// 解析分享链接并生成客户端节点配置
function 解析链接值值节点(链接652) {
  try {
    // 解析第一类链接
    if (链接652.startsWith(解码64('dmxlc3M6Ly8='))) {
      const 网址651 = new URL(链接652);
      const 名称650 = decodeURIComponent(网址651.hash.substring(1));
      const 唯一标识649 = 网址651.username;
      const 本地值648 = 网址651.hostname;
      const 端口647 = parseInt(网址651.port) || 443;
      const 参数646 = new URLSearchParams(网址651.search);
      const 传输层安全645 = 参数646.get('security') === 'tls' || 参数646.get('tls') === 'true';
      const 本地值644 = 参数646.get('type') || 'ws';
      const 路径643 = 参数646.get('path') || '/?ed=2048';
      const 主机642 = 参数646.get('host') || 本地值648;
      const 本地值641 = 参数646.get('sni') || 主机642;
      const 应用层协议协商原始640 = 参数646.get('alpn') || '';
      const 本地值639 = 参数646.get('fp') || 参数646.get('client-fingerprint') || 'chrome';
      const 加密客户端问候638 = 参数646.get('ech');
      const 节点637 = {
        name: 名称650,
        type: 解码64('dmxlc3M='),
        server: 本地值648,
        port: 端口647,
        uuid: 唯一标识649,
        tls: 传输层安全645,
        network: 本地值644,
        'client-fingerprint': 本地值639
      };
      if (传输层安全645) {
        节点637.servername = 本地值641;
        if (应用层协议协商原始640) 节点637.alpn = 应用层协议协商原始640.split(',').map(甲值636 => 甲值636.trim()).filter(Boolean);
        节点637['skip-cert-verify'] = false;
      }
      if (本地值644 === 'ws') {
        节点637['ws-opts'] = {
          path: 路径643,
          headers: {
            Host: 主机642
          }
        };
      }
      if (加密客户端问候638) {
        const 加密客户端问候域名635 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
        节点637['ech-opts'] = {
          enable: true,
          'query-server-name': 加密客户端问候域名635
        };
      }
      return 节点637;
    }

    // 解析第二类链接
    if (链接652.startsWith(解码64('dHJvamFuOi8v'))) {
      const 网址634 = new URL(链接652);
      const 名称633 = decodeURIComponent(网址634.hash.substring(1));
      const 密码632 = 网址634.username;
      const 本地值631 = 网址634.hostname;
      const 端口630 = parseInt(网址634.port) || 443;
      const 参数629 = new URLSearchParams(网址634.search);
      const 本地值628 = 参数629.get('type') || 'ws';
      const 路径 = 参数629.get('path') || '/?ed=2048';
      const 主机627 = 参数629.get('host') || 本地值631;
      const 服务名称指示626 = 参数629.get('sni') || 主机627;
      const 应用层协议协商原始 = 参数629.get('alpn') || '';
      const 加密客户端问候 = 参数629.get('ech');
      const 节点 = {
        name: 名称633,
        type: 解码64('dHJvamFu'),
        server: 本地值631,
        port: 端口630,
        password: 密码632,
        network: 本地值628,
        sni: 服务名称指示626,
        'skip-cert-verify': false
      };
      if (应用层协议协商原始) 节点.alpn = 应用层协议协商原始.split(',').map(甲值625 => 甲值625.trim()).filter(Boolean);
      if (本地值628 === 'ws') {
        节点['ws-opts'] = {
          path: 路径,
          headers: {
            Host: 主机627
          }
        };
      }
      if (加密客户端问候) {
        const 加密客户端问候域名624 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
        节点['ech-opts'] = {
          enable: true,
          'query-server-name': 加密客户端问候域名624
        };
      }
      return 节点;
    }
  } catch (事件值623) {
    return null;
  }
  return null;
}

// ============================================================
// 内部格式转换器 - 不依赖外部服务
// ============================================================

// 用于 YAML 引号包裹（避免 IPv6 方括号、逗号等被解析为数组）
function 处理本地值622(取值621) {
  if (取值621 == null) return '""';
  const 字符串值620 = String(取值621);
  return '"' + 字符串值620.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// URL.hostname 对 IPv6 会带方括号，直接写入 YAML 会被当成数组
function 规范化值主机(主机名619) {
  if (!主机名619) return 主机名619;
  const 头值618 = String(主机名619);
  if (头值618.startsWith('[') && 头值618.endsWith(']')) return 头值618.slice(1, -1);
  return 头值618;
}

// 策略组列表：策略组 + 全部节点（避免分组里只有「节点选择」没有具体节点）
function 处理值选择值(名称列表617, 本地值616 = {}) {
  const {
    directFirst: 直连首次615 = false,
    extraGroups: 值值614 = []
  } = 本地值616;
  const 节点行列表 = 名称列表617.length ? 名称列表617.map(数量值613 => `      - ${处理本地值622(数量值613)}`).join('\n') : '      - DIRECT';
  const 行列表612 = [];
  if (直连首次615) {
    行列表612.push('      - "🎯 全球直连"', '      - "🚀 节点选择"');
  } else {
    行列表612.push('      - "🚀 节点选择"', '      - "🎯 全球直连"');
  }
  for (const 本地值611 of 值值614) 行列表612.push(`      - ${处理本地值622(本地值611)}`);
  行列表612.push(节点行列表);
  return 行列表612.join('\n');
}

// 圈类客户端策略组列表：策略组 + 全部节点
function 处理值值列表(名称列表610, 本地值609 = {}) {
  const {
    directFirst: 直连首次 = false,
    extraGroups: 值值608 = [],
    compact: 本地值607 = false
  } = 本地值609;
  const 本地值606 = 本地值607 ? ',' : ', ';
  const 列表605 = 名称列表610.length ? 名称列表610.join(本地值606) : 'DIRECT';
  const 部分列表604 = [];
  if (直连首次) 部分列表604.push('🎯 全球直连', '🚀 节点选择');else 部分列表604.push('🚀 节点选择', '🎯 全球直连');
  部分列表604.push(...值值608);
  if (名称列表610.length) 部分列表604.push(列表605);
  return 部分列表604.join(本地值606);
}

// 解析任意分享链接为通用节点对象
function 解析值链接(链接603) {
  try {
    if (链接603.startsWith(解码64('dmxlc3M6Ly8='))) {
      const 网址602 = new URL(链接603);
      const 参数值601 = new URLSearchParams(网址602.search);
      return {
        proto: 解码64('dmxlc3M='),
        name: decodeURIComponent(网址602.hash.substring(1)) || 网址602.hostname + ':' + 网址602.port,
        uuid: 网址602.username,
        server: 规范化值主机(网址602.hostname),
        port: parseInt(网址602.port) || 443,
        tls: 参数值601.get('security') === 'tls' || 参数值601.get('security') === 解码64('cmVhbGl0eQ=='),
        network: 参数值601.get('type') || 'ws',
        path: 参数值601.get('path') || '/?ed=2048',
        host: 规范化值主机(参数值601.get('host') || 网址602.hostname),
        sni: 规范化值主机(参数值601.get('sni') || 参数值601.get('host') || 网址602.hostname),
        alpn: (参数值601.get('alpn') || '').split(',').map(字符串值600 => 字符串值600.trim()).filter(Boolean),
        fp: 参数值601.get('fp') || 'chrome',
        flow: 参数值601.get('flow') || '',
        encryption: 参数值601.get('encryption') || 'none',
        mode: 参数值601.get('mode') || '',
        ech: 参数值601.get('ech') || ''
      };
    }
  } catch (事件值597) {}
  return null;
}

// 单个节点 → 块级 YAML（避免 flow style 解析错误）
function 构建值节点行(数量值596) {
  const 行列表595 = [];
  const 本地值594 = 规范化值主机(数量值596.server);
  const 主机593 = 规范化值主机(数量值596.host) || 本地值594;
  const 服务名称指示592 = 规范化值主机(数量值596.sni) || 主机593;
  行列表595.push(`  - name: ${处理本地值622(数量值596.name)}`);
  行列表595.push(`    type: ${数量值596.proto}`);
  行列表595.push(`    server: ${处理本地值622(本地值594)}`);
  行列表595.push(`    port: ${数量值596.port}`);
  if (数量值596.proto === 解码64('dmxlc3M=')) {
    行列表595.push(`    uuid: ${数量值596.uuid}`);
    行列表595.push(`    udp: true`);
    行列表595.push(`    tls: ${数量值596.tls ? 'true' : 'false'}`);
    if (数量值596.flow) 行列表595.push(`    flow: ${处理本地值622(数量值596.flow)}`);
    行列表595.push(`    client-fingerprint: ${处理本地值622(数量值596.fp || 'chrome')}`);
  }
  if (数量值596.tls) {
    行列表595.push(`    servername: ${处理本地值622(服务名称指示592)}`);
    if (数量值596.alpn && 数量值596.alpn.length) {
      行列表595.push(`    alpn: [${数量值596.alpn.map(甲值591 => 处理本地值622(甲值591)).join(', ')}]`);
    }
    行列表595.push(`    skip-cert-verify: false`);
  }
  if (数量值596.network === 'ws') {
    行列表595.push(`    network: ws`);
    行列表595.push(`    ws-opts:`);
    行列表595.push(`      path: ${处理本地值622(数量值596.path)}`);
    行列表595.push(`      headers:`);
    行列表595.push(`        Host: ${处理本地值622(主机593)}`);
  } else if (数量值596.network === 'grpc') {
    行列表595.push(`    network: grpc`);
    行列表595.push(`    grpc-opts:`);
    行列表595.push(`      grpc-service-name: ${处理本地值622(数量值596.path)}`);
  }
  if (数量值596.ech) {
    const 加密客户端问候域名590 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
    行列表595.push(`    ech-opts:`);
    行列表595.push(`      enable: true`);
    行列表595.push(`      query-server-name: ${处理本地值622(加密客户端问候域名590)}`);
  }
  return 行列表595.join('\n');
}

// 内部生成 YAML（完整规则集，远端 rule-providers）
function 生成值值589(链接列表588, 本地值587 = {}) {
  const 节点列表586 = 链接列表588.map(解析值链接).filter(数量值585 => 数量值585 && 数量值585.proto === 解码64('dmxlc3M='));
  const 名称列表584 = 节点列表586.map(数量值583 => 数量值583.name);
  const 域名系统值582 = 自定义域名系统 || 'https://223.5.5.5/dns-query';
  const 头部581 = ['mixed-port: 7890', 'allow-lan: true', 'mode: rule', 'log-level: info', 'ipv6: true', 'external-controller: 127.0.0.1:9090', 'unified-delay: true', 'tcp-concurrent: true', 'geodata-mode: true', 'geo-auto-update: true', 'geo-update-interval: 24', 'geox-url:', '  geoip: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"', '  geosite: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"', '  mmdb: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"', '  asn: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/GeoLite2-ASN.mmdb"', 'sniffer:', '  enable: true', '  force-dns-mapping: true', '  parse-pure-ip: true', '  sniff:', '    HTTP:', '      ports: [80, 8080-8880]', '      override-destination: true', '    TLS:', '      ports: [443, 8443]', '    QUIC:', '      ports: [443, 8443]', 'dns:', '  enable: true', '  listen: 0.0.0.0:1053', '  ipv6: true', '  enhanced-mode: fake-ip', '  fake-ip-range: 198.18.0.1/16', '  fake-ip-filter:', '    - "*.lan"', '    - "+.local"', '    - "+.market.xiaomi.com"', '    - "+.msftconnecttest.com"', '    - "+.msftncsi.com"', '    - "localhost.ptlogin2.qq.com"', '    - "+.srv.nintendo.net"', '    - "+.stun.playstation.net"', '    - "+.xboxlive.com"', '  default-nameserver:', '    - 223.5.5.5', '    - 119.29.29.29', '  nameserver:', `    - ${域名系统值582}`, '    - https://119.29.29.29/dns-query', '  fallback:', '    - https://1.1.1.1/dns-query', '    - https://8.8.8.8/dns-query', '  fallback-filter:', '    geoip: true', '    geoip-code: CN', '    ipcidr:', '      - 240.0.0.0/4', ''];
  const 值值580 = ['proxies:'];
  for (const 数量值579 of 节点列表586) 值值580.push(构建值节点行(数量值579));
  const 节点仅 = 名称列表584.length ? 名称列表584.map(数量值578 => `      - ${处理本地值622(数量值578)}`).join('\n') : '      - DIRECT';
  const 值值577 = [解码64('cHJveHktZ3JvdXBzOg=='), '  - name: "🚀 节点选择"', '    type: select', '    proxies:', '      - "🎯 全球直连"', 节点仅, '  - name: "🌍 国外媒体"', '    type: select', '    proxies:', 处理值选择值(名称列表584), '  - name: "📺 哔哩哔哩"', '    type: select', '    proxies:', 处理值选择值(名称列表584, {
    directFirst: true
  }), '  - name: "📹 油管视频"', '    type: select', '    proxies:', 处理值选择值(名称列表584, {
    extraGroups: ['🌍 国外媒体']
  }), '  - name: "🎬 奈飞视频"', '    type: select', '    proxies:', 处理值选择值(名称列表584, {
    extraGroups: ['🌍 国外媒体']
  }), '  - name: "📲 电报信息"', '    type: select', '    proxies:', 处理值选择值(名称列表584), '  - name: "🌐 谷歌服务"', '    type: select', '    proxies:', 处理值选择值(名称列表584), '  - name: "🤖 OpenAI"', '    type: select', '    proxies:', 处理值选择值(名称列表584), '  - name: "Ⓜ️ 微软服务"', '    type: select', '    proxies:', 处理值选择值(名称列表584, {
    directFirst: true
  }), '  - name: "🍎 苹果服务"', '    type: select', '    proxies:', 处理值选择值(名称列表584, {
    directFirst: true
  }), '  - name: "🎯 全球直连"', '    type: select', '    proxies:', '      - DIRECT', '  - name: "🛑 全球拦截"', '    type: select', '    proxies:', '      - REJECT', '      - DIRECT', '  - name: "🍃 应用净化"', '    type: select', '    proxies:', '      - REJECT', '      - DIRECT', '  - name: "🐟 漏网之鱼"', '    type: select', '    proxies:', 处理值选择值(名称列表584), ''];

  // 规则源 - CDN: jsDelivr
  const 值基础576 = 解码64('aHR0cHM6Ly9mYXN0bHkuanNkZWxpdnIubmV0L2doL0xveWFsc29sZGllci9jbGFzaC1ydWxlc0ByZWxlYXNl');
  const 提供器 = (名称575, 本地值574) => [`  ${名称575}:`, `    type: http`, `    behavior: ${本地值574}`, `    url: "${值基础576}/${名称575}.txt"`, `    path: ./rulesets/loyalsoldier/${名称575}.txt`, `    interval: 86400`].join('\n');
  const 规则值 = ['rule-providers:', 提供器('reject', 'domain'), 提供器('icloud', 'domain'), 提供器('apple', 'domain'), 提供器('google', 'domain'), 提供器(解码64('cHJveHk='), 'domain'), 提供器('direct', 'domain'), 提供器('private', 'domain'), 提供器('gfw', 'domain'), 提供器('greatfire', 'domain'), 提供器('tld-not-cn', 'domain'), 提供器('telegramcidr', 'ipcidr'), 提供器('cncidr', 'ipcidr'), 提供器('lancidr', 'ipcidr'), 提供器('applications', 'classical'), ''];
  const 规则列表 = ['rules:', '  - DOMAIN-SUFFIX,acl4.ssr,🎯 全球直连', '  - DOMAIN-SUFFIX,local,🎯 全球直连', 解码64('ICAtIERPTUFJTixjbGFzaC5yYXpvcmQudG9wLPCfjq8g5YWo55CD55u06L+e'), '  - DOMAIN,yacd.haishan.me,🎯 全球直连', '  - DOMAIN,yacd.metacubex.one,🎯 全球直连', '  - DOMAIN,d.metacubex.one,🎯 全球直连', '  - DOMAIN-SUFFIX,googleapis.cn,🌐 谷歌服务', '  - DOMAIN-SUFFIX,gstatic.com,🌐 谷歌服务', '  - DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🌐 谷歌服务', '  - DOMAIN-SUFFIX,googlevideo.com,📹 油管视频', '  - DOMAIN-SUFFIX,googleusercontent.com,🌐 谷歌服务', '  - DOMAIN-KEYWORD,youtube,📹 油管视频', '  - DOMAIN-SUFFIX,youtube.com,📹 油管视频', '  - DOMAIN-SUFFIX,youtu.be,📹 油管视频', '  - DOMAIN-KEYWORD,netflix,🎬 奈飞视频', '  - DOMAIN-SUFFIX,nflxext.com,🎬 奈飞视频', '  - DOMAIN-SUFFIX,nflxso.net,🎬 奈飞视频', '  - DOMAIN-SUFFIX,nflxvideo.net,🎬 奈飞视频', '  - DOMAIN-SUFFIX,nflximg.com,🎬 奈飞视频', '  - DOMAIN-SUFFIX,nflximg.net,🎬 奈飞视频', '  - DOMAIN-SUFFIX,netflix.com,🎬 奈飞视频', '  - DOMAIN-SUFFIX,netflix.net,🎬 奈飞视频', '  - DOMAIN-SUFFIX,bilibili.com,📺 哔哩哔哩', '  - DOMAIN-SUFFIX,bilivideo.com,📺 哔哩哔哩', '  - DOMAIN-SUFFIX,hdslb.com,📺 哔哩哔哩', '  - DOMAIN-KEYWORD,openai,🤖 OpenAI', '  - DOMAIN-KEYWORD,chatgpt,🤖 OpenAI', '  - DOMAIN-SUFFIX,openai.com,🤖 OpenAI', '  - DOMAIN-SUFFIX,chatgpt.com,🤖 OpenAI', '  - DOMAIN-SUFFIX,oaistatic.com,🤖 OpenAI', '  - DOMAIN-SUFFIX,oaiusercontent.com,🤖 OpenAI', '  - DOMAIN-SUFFIX,anthropic.com,🤖 OpenAI', '  - DOMAIN-SUFFIX,claude.ai,🤖 OpenAI', '  - DOMAIN-SUFFIX,perplexity.ai,🤖 OpenAI', '  - DOMAIN-SUFFIX,gemini.google.com,🤖 OpenAI', '  - RULE-SET,applications,🎯 全球直连', '  - RULE-SET,private,🎯 全球直连', '  - RULE-SET,reject,🛑 全球拦截', '  - RULE-SET,icloud,🍎 苹果服务', '  - RULE-SET,apple,🍎 苹果服务', '  - RULE-SET,google,🌐 谷歌服务', 解码64('ICAtIFJVTEUtU0VULHByb3h5LPCfmoAg6IqC54K56YCJ5oup'), '  - RULE-SET,gfw,🚀 节点选择', '  - RULE-SET,greatfire,🚀 节点选择', '  - RULE-SET,tld-not-cn,🚀 节点选择', '  - RULE-SET,direct,🎯 全球直连', '  - RULE-SET,lancidr,🎯 全球直连,no-resolve', '  - RULE-SET,cncidr,🎯 全球直连,no-resolve', '  - RULE-SET,telegramcidr,📲 电报信息,no-resolve', '  - GEOIP,LAN,🎯 全球直连,no-resolve', '  - GEOIP,CN,🎯 全球直连,no-resolve', '  - MATCH,🐟 漏网之鱼'];
  return [头部581.join('\n'), 值值580.join('\n'), '', 值值577.join('\n'), 规则值.join('\n'), 规则列表.join('\n'), ''].join('\n');
}

// 内部生成 JSON 客户端配置（完整规则集：远端镜像）
function 生成值值数据对象(链接列表573) {
  const 节点列表572 = 链接列表573.map(解析值链接).filter(数量值571 => 数量值571 && 数量值571.proto === 解码64('dmxlc3M='));
  const 域名系统值570 = 自定义域名系统 || 'https://223.5.5.5/dns-query';
  const 出站值 = 节点列表572.map(数量值569 => 数量值569.name);
  function 处理节点值出站(数量值568) {
    const 输出567 = {
      type: 数量值568.proto,
      tag: 数量值568.name,
      server: 规范化值主机(数量值568.server),
      server_port: 数量值568.port
    };
    输出567.uuid = 数量值568.uuid;
    if (数量值568.flow) 输出567.flow = 数量值568.flow;
    if (数量值568.tls) {
      输出567.tls = {
        enabled: true,
        server_name: 数量值568.sni,
        insecure: false,
        utls: {
          enabled: true,
          fingerprint: 数量值568.fp || 'chrome'
        }
      };
      if (数量值568.alpn && 数量值568.alpn.length) 输出567.tls.alpn = 数量值568.alpn;
      if (数量值568.ech) {
        输出567.tls.ech = {
          enabled: true,
          pq_signature_schemes_enabled: false,
          dynamic_record_sizing_disabled: false
        };
      }
    }
    if (数量值568.network === 'ws') {
      输出567.transport = {
        type: 'ws',
        path: 数量值568.path,
        headers: {
          Host: 数量值568.host
        },
        max_early_data: 2048,
        early_data_header_name: 'Sec-WebSocket-Protocol'
      };
    } else if (数量值568.network === 'grpc') {
      输出567.transport = {
        type: 'grpc',
        service_name: 数量值568.path
      };
    }
    return 输出567;
  }

  // 远端 SRS 文件（CDN：jsDelivr 镜像）
  const 值基础值 = 'https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite';
  const 值基础地址 = 'https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip';
  const 值规则566 = 本地值565 => ({
    tag: `geosite-${本地值565}`,
    type: 'remote',
    format: 'binary',
    url: `${值基础值}/${本地值565}.srs`,
    download_detour: 'direct'
  });
  const 地址规则 = 本地值564 => ({
    tag: `geoip-${本地值564}`,
    type: 'remote',
    format: 'binary',
    url: `${值基础地址}/${本地值564}.srs`,
    download_detour: 'direct'
  });
  const 配置 = {
    log: {
      level: 'info',
      timestamp: true
    },
    dns: {
      servers: [{
        tag: 'remote',
        address: 域名系统值570,
        detour: 'select'
      }, {
        tag: 'local',
        address: '223.5.5.5',
        detour: 'direct'
      }, {
        tag: 'fakeip',
        address: 'fakeip'
      }, {
        tag: 'block',
        address: 'rcode://success'
      }],
      rules: [{
        outbound: 'any',
        server: 'local'
      }, {
        rule_set: 'geosite-category-ads-all',
        server: 'block'
      }, {
        rule_set: 'geosite-cn',
        server: 'local'
      }, {
        query_type: ['A', 'AAAA'],
        server: 'fakeip'
      }],
      fakeip: {
        enabled: true,
        inet4_range: '198.18.0.0/15',
        inet6_range: 'fc00::/18'
      },
      independent_cache: true,
      strategy: 'ipv4_only'
    },
    inbounds: [{
      type: 'mixed',
      tag: 'mixed-in',
      listen: '127.0.0.1',
      listen_port: 2080,
      sniff: true,
      sniff_override_destination: true
    }, {
      type: 'tun',
      tag: 'tun-in',
      interface_name: 解码64('c2luZy1ib3g='),
      address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
      mtu: 9000,
      auto_route: true,
      strict_route: true,
      stack: 'mixed',
      sniff: true,
      sniff_override_destination: true
    }],
    outbounds: [{
      type: 'selector',
      tag: 'select',
      outbounds: ['direct', ...出站值],
      default: 出站值[0] || 'direct'
    }, {
      type: 'selector',
      tag: '🌍 国外媒体',
      outbounds: ['select', 'direct', ...出站值]
    }, {
      type: 'selector',
      tag: '📲 电报信息',
      outbounds: ['select', 'direct', ...出站值]
    }, {
      type: 'selector',
      tag: '🌐 谷歌服务',
      outbounds: ['select', 'direct', ...出站值]
    }, {
      type: 'selector',
      tag: '🤖 OpenAI',
      outbounds: ['select', 'direct', ...出站值]
    }, {
      type: 'selector',
      tag: 'Ⓜ️ 微软服务',
      outbounds: ['direct', 'select', ...出站值]
    }, {
      type: 'selector',
      tag: '🍎 苹果服务',
      outbounds: ['direct', 'select', ...出站值]
    }, {
      type: 'selector',
      tag: '📺 哔哩哔哩',
      outbounds: ['direct', 'select', ...出站值]
    }, {
      type: 'selector',
      tag: '📹 油管视频',
      outbounds: ['select', '🌍 国外媒体', 'direct', ...出站值]
    }, {
      type: 'selector',
      tag: '🎬 奈飞视频',
      outbounds: ['select', '🌍 国外媒体', 'direct', ...出站值]
    }, {
      type: 'selector',
      tag: '🎯 全球直连',
      outbounds: ['direct']
    }, {
      type: 'selector',
      tag: '🐟 漏网之鱼',
      outbounds: ['select', 'direct', ...出站值]
    }, ...节点列表572.map(处理节点值出站), {
      type: 'direct',
      tag: 'direct'
    }, {
      type: 'block',
      tag: 'block'
    }, {
      type: 'dns',
      tag: 'dns-out'
    }],
    route: {
      rule_set: [值规则566('cn'), 值规则566('private'), 值规则566('apple'), 值规则566('apple-cn'), 值规则566('microsoft'), 值规则566('microsoft@cn'), 值规则566('google'), 值规则566('telegram'), 值规则566('openai'), 值规则566('anthropic'), 值规则566('youtube'), 值规则566('netflix'), 值规则566('disney'), 值规则566('spotify'), 值规则566('tiktok'), 值规则566('twitter'), 值规则566('facebook'), 值规则566('github'), 值规则566('geolocation-!cn'), 值规则566('category-ads-all'), 地址规则('cn'), 地址规则('private'), 地址规则('telegram')],
      rules: [{
        protocol: 'dns',
        outbound: 'dns-out'
      }, {
        ip_is_private: true,
        outbound: 'direct'
      }, {
        rule_set: 'geosite-category-ads-all',
        outbound: 'block'
      }, {
        rule_set: 'geosite-private',
        outbound: 'direct'
      }, {
        rule_set: 'geosite-apple-cn',
        outbound: 'direct'
      }, {
        rule_set: 'geosite-microsoft@cn',
        outbound: 'direct'
      }, {
        rule_set: 'geosite-apple',
        outbound: '🍎 苹果服务'
      }, {
        rule_set: 'geosite-microsoft',
        outbound: 'Ⓜ️ 微软服务'
      }, {
        rule_set: 'geosite-openai',
        outbound: '🤖 OpenAI'
      }, {
        rule_set: 'geosite-anthropic',
        outbound: '🤖 OpenAI'
      }, {
        rule_set: 'geosite-telegram',
        outbound: '📲 电报信息'
      }, {
        rule_set: 'geoip-telegram',
        outbound: '📲 电报信息'
      }, {
        rule_set: 'geosite-google',
        outbound: '🌐 谷歌服务'
      }, {
        rule_set: 'geosite-youtube',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-netflix',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-disney',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-spotify',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-tiktok',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-twitter',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-facebook',
        outbound: '🌍 国外媒体'
      }, {
        rule_set: 'geosite-github',
        outbound: 'select'
      }, {
        rule_set: 'geosite-geolocation-!cn',
        outbound: 'select'
      }, {
        rule_set: 'geosite-cn',
        outbound: 'direct'
      }, {
        rule_set: 'geoip-cn',
        outbound: 'direct'
      }, {
        ip_is_private: true,
        outbound: 'direct'
      }],
      final: '🐟 漏网之鱼',
      auto_detect_interface: true
    },
    experimental: {
      cache_file: {
        enabled: true,
        store_fakeip: true
      },
      clash_api: {
        external_controller: '127.0.0.1:9090'
      }
    }
  };
  return JSON.stringify(配置, null, 2);
}

// 规则源（CDN：jsDelivr 镜像 GitHub）
const 值基础 = 解码64('aHR0cHM6Ly9mYXN0bHkuanNkZWxpdnIubmV0L2doL0FDTDRTU1IvQUNMNFNTUkBtYXN0ZXIvQ2xhc2g=');
const 值规则 = 名称563 => `${值基础}/${名称563}.list`;

// 内部生成 ini 客户端配置（完整规则集）
function 生成值值562(链接列表561) {
  const 节点列表560 = 链接列表561.map(解析值链接).filter(数量值559 => 数量值559 && 数量值559.proto === 解码64('dHJvamFu'));
  const 域名系统值558 = 自定义域名系统 || '223.5.5.5';
  const 名称列表557 = 节点列表560.map(数量值556 => 数量值556.name);
  const 行列表555 = ['[General]', 'loglevel = notify', 'internet-test-url = http://www.apple.com/library/test/success.html', 解码64('cHJveHktdGVzdC11cmwgPSBodHRwOi8vd3d3LmdzdGF0aWMuY29tL2dlbmVyYXRlXzIwNA=='), 'test-timeout = 3', `dns-server = ${域名系统值558.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}, 119.29.29.29, system`, 'encrypted-dns-server = https://223.5.5.5/dns-query, https://1.12.12.12/dns-query', 'ipv6 = true', 'allow-wifi-access = false', 'wifi-access-http-port = 6152', 解码64('d2lmaS1hY2Nlc3Mtc29ja3M1LXBvcnQgPSA2MTUz'), 解码64('c2tpcC1wcm94eSA9IDEyNy4wLjAuMSwgMTkyLjE2OC4wLjAvMTYsIDEwLjAuMC4wLzgsIDE3Mi4xNi4wLjAvMTIsIGxvY2FsaG9zdCwgKi5sb2NhbCwgY2FwdGl2ZS5hcHBsZS5jb20='), 'exclude-simple-hostnames = true', 'show-error-page-for-reject = true', '', 解码64('W1Byb3h5XQ==')];
  for (const 数量值554 of 节点列表560) {
    const 服务名称指示 = 数量值554.sni;
    行列表555.push(`${数量值554.name} = ${解码64('dHJvamFu')}, ${数量值554.server}, ${数量值554.port}, password=${数量值554.password}, sni=${服务名称指示}, ws=true, ws-path=${数量值554.path}, ws-headers=Host:${数量值554.host}, skip-cert-verify=false, tfo=true`);
  }
  if (!节点列表560.length) {
    行列表555.push('Direct = direct');
  }
  行列表555.push('');
  行列表555.push(解码64('W1Byb3h5IEdyb3VwXQ=='));
  const 列表553 = 名称列表557.length ? 名称列表557.join(', ') : 'DIRECT';
  行列表555.push(`🚀 节点选择 = select, 🎯 全球直连, ${列表553}`);
  行列表555.push(`🌍 国外媒体 = select, ${处理值值列表(名称列表557)}`);
  行列表555.push(`📺 哔哩哔哩 = select, ${处理值值列表(名称列表557, {
    directFirst: true
  })}`);
  行列表555.push(`📹 油管视频 = select, ${处理值值列表(名称列表557, {
    extraGroups: ['🌍 国外媒体']
  })}`);
  行列表555.push(`🎬 奈飞视频 = select, ${处理值值列表(名称列表557, {
    extraGroups: ['🌍 国外媒体']
  })}`);
  行列表555.push(`📲 电报信息 = select, ${处理值值列表(名称列表557)}`);
  行列表555.push(`🌐 谷歌服务 = select, ${处理值值列表(名称列表557)}`);
  行列表555.push(`🤖 OpenAI = select, ${处理值值列表(名称列表557)}`);
  行列表555.push(`Ⓜ️ 微软服务 = select, ${处理值值列表(名称列表557, {
    directFirst: true
  })}`);
  行列表555.push(`🍎 苹果服务 = select, ${处理值值列表(名称列表557, {
    directFirst: true
  })}`);
  行列表555.push(`🎯 全球直连 = select, DIRECT`);
  行列表555.push(`🛑 全球拦截 = select, REJECT, DIRECT`);
  行列表555.push(`🐟 漏网之鱼 = select, ${处理值值列表(名称列表557)}`);
  行列表555.push('');
  行列表555.push('[Rule]');
  行列表555.push(`RULE-SET,${值规则('LocalAreaNetwork')},🎯 全球直连`);
  行列表555.push(`RULE-SET,${值规则('UnBan')},🎯 全球直连`);
  行列表555.push(`RULE-SET,${值规则('BanAD')},🛑 全球拦截`);
  行列表555.push(`RULE-SET,${值规则('BanProgramAD')},🛑 全球拦截`);
  行列表555.push(`RULE-SET,${值规则('GoogleFCM')},🌐 谷歌服务`);
  行列表555.push(`RULE-SET,${值规则('GoogleCN')},🎯 全球直连`);
  行列表555.push(`RULE-SET,${值规则('SteamCN')},🎯 全球直连`);
  行列表555.push(`RULE-SET,${值规则('Microsoft')},Ⓜ️ 微软服务`);
  行列表555.push(`RULE-SET,${值规则('Apple')},🍎 苹果服务`);
  行列表555.push(`RULE-SET,${值规则('Telegram')},📲 电报信息`);
  行列表555.push(`RULE-SET,${值规则('OpenAi')},🤖 OpenAI`);
  行列表555.push(`RULE-SET,${值规则('Claude')},🤖 OpenAI`);
  行列表555.push(`RULE-SET,${值规则('Copilot')},🤖 OpenAI`);
  行列表555.push(`RULE-SET,${值规则('Netflix')},🌍 国外媒体`);
  行列表555.push(`RULE-SET,${值规则('YouTube')},🌍 国外媒体`);
  行列表555.push(`RULE-SET,${值规则('Disney')},🌍 国外媒体`);
  行列表555.push(`RULE-SET,${值规则('Spotify')},🌍 国外媒体`);
  行列表555.push(`RULE-SET,${值规则('TikTok')},🌍 国外媒体`);
  行列表555.push(`RULE-SET,${值规则('BiliBili')},📺 哔哩哔哩`);
  行列表555.push(`RULE-SET,${值规则(解码64('UHJveHlNZWRpYQ=='))},🌍 国外媒体`);
  行列表555.push(`RULE-SET,${值规则(解码64('UHJveHlHRldsaXN0'))},🚀 节点选择`);
  行列表555.push(`RULE-SET,${值规则('ChinaDomain')},🎯 全球直连`);
  行列表555.push(`RULE-SET,${值规则('ChinaCompanyIp')},🎯 全球直连`);
  行列表555.push(`RULE-SET,${值规则('ChinaIp')},🎯 全球直连`);
  行列表555.push('GEOIP,CN,🎯 全球直连');
  行列表555.push('FINAL,🐟 漏网之鱼,dns-failed');
  return 行列表555.join('\n');
}

// 内部生成另一类 ini 客户端配置
function 生成值值552(链接列表551) {
  const 节点列表550 = 链接列表551.map(解析值链接).filter(数量值549 => 数量值549 && (数量值549.proto === 解码64('dmxlc3M=') || 数量值549.proto === 解码64('dHJvamFu')));
  const 名称列表548 = 节点列表550.map(数量值547 => 数量值547.name);
  const 行列表546 = ['[General]', 'ip-mode = dual', `dns-server = ${(自定义域名系统 || '223.5.5.5').replace(/^https?:\/\//, '').replace(/\/.*$/, '')},119.29.29.29,system`, 'doh-server = https://223.5.5.5/dns-query, https://1.12.12.12/dns-query', 解码64('YWxsb3ctdWRwLXByb3h5ID0gdHJ1ZQ=='), 'allow-wifi-access = false', 'sni-sniffing = true', 解码64('c2tpcC1wcm94eSA9IDEyNy4wLjAuMSwxOTIuMTY4LjAuMC8xNiwxMC4wLjAuMC84LDE3Mi4xNi4wLjAvMTIsbG9jYWxob3N0LCoubG9jYWwsY2FwdGl2ZS5hcHBsZS5jb20='), 'bypass-tun = 10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.0.0.0/24,192.0.2.0/24,192.88.99.0/24,192.168.0.0/16,198.51.100.0/24,203.0.113.0/24,224.0.0.0/4,255.255.255.255/32', '', 解码64('W1Byb3h5XQ==')];
  for (const 数量值545 of 节点列表550) {
    if (数量值545.proto === 解码64('dmxlc3M=')) {
      const 部分列表544 = [`${数量值545.server}`, `${数量值545.port}`, `udp=true`, `username=${数量值545.uuid}`, `transport=ws`, `path=${数量值545.path}`, `host=${数量值545.host}`, `over-tls=${数量值545.tls ? 'true' : 'false'}`];
      if (数量值545.tls) {
        部分列表544.push(`tls-name=${数量值545.sni}`);
        if (数量值545.alpn && 数量值545.alpn.length) 部分列表544.push(`alpn=${数量值545.alpn.join(':')}`);
        部分列表544.push(`skip-cert-verify=false`);
      }
      行列表546.push(`${数量值545.name} = ${解码64('dmxlc3M=')},${部分列表544.join(',')}`);
    } else {
      const 部分列表543 = [`${数量值545.server}`, `${数量值545.port}`, `password=${数量值545.password}`, `transport=ws`, `path=${数量值545.path}`, `host=${数量值545.host}`, `over-tls=true`, `tls-name=${数量值545.sni}`];
      if (数量值545.alpn && 数量值545.alpn.length) 部分列表543.push(`alpn=${数量值545.alpn.join(':')}`);
      部分列表543.push(`skip-cert-verify=false`);
      行列表546.push(`${数量值545.name} = ${解码64('dHJvamFu')},${部分列表543.join(',')}`);
    }
  }
  行列表546.push('');
  行列表546.push(解码64('W1Byb3h5IEdyb3VwXQ=='));
  const 列表542 = 名称列表548.length ? 名称列表548.join(',') : 'DIRECT';
  行列表546.push(`🚀 节点选择 = select,🎯 全球直连,${列表542}`);
  行列表546.push(`🌍 国外媒体 = select,${处理值值列表(名称列表548, {
    compact: true
  })}`);
  行列表546.push(`📺 哔哩哔哩 = select,${处理值值列表(名称列表548, {
    directFirst: true,
    compact: true
  })}`);
  行列表546.push(`📹 油管视频 = select,${处理值值列表(名称列表548, {
    extraGroups: ['🌍 国外媒体'],
    compact: true
  })}`);
  行列表546.push(`🎬 奈飞视频 = select,${处理值值列表(名称列表548, {
    extraGroups: ['🌍 国外媒体'],
    compact: true
  })}`);
  行列表546.push(`📲 电报信息 = select,${处理值值列表(名称列表548, {
    compact: true
  })}`);
  行列表546.push(`🌐 谷歌服务 = select,${处理值值列表(名称列表548, {
    compact: true
  })}`);
  行列表546.push(`🤖 OpenAI = select,${处理值值列表(名称列表548, {
    compact: true
  })}`);
  行列表546.push(`Ⓜ️ 微软服务 = select,${处理值值列表(名称列表548, {
    directFirst: true,
    compact: true
  })}`);
  行列表546.push(`🍎 苹果服务 = select,${处理值值列表(名称列表548, {
    directFirst: true,
    compact: true
  })}`);
  行列表546.push(`🎯 全球直连 = select,DIRECT`);
  行列表546.push(`🛑 全球拦截 = select,REJECT,DIRECT`);
  行列表546.push(`🐟 漏网之鱼 = select,${处理值值列表(名称列表548, {
    compact: true
  })}`);
  行列表546.push('');
  行列表546.push('[Remote Rule]');
  行列表546.push(`${值规则('LocalAreaNetwork')}, policy=🎯 全球直连, tag=局域网, enabled=true`);
  行列表546.push(`${值规则('BanAD')}, policy=🛑 全球拦截, tag=广告拦截, enabled=true`);
  行列表546.push(`${值规则('BanProgramAD')}, policy=🛑 全球拦截, tag=应用广告, enabled=true`);
  行列表546.push(`${值规则('GoogleCN')}, policy=🎯 全球直连, tag=GoogleCN, enabled=true`);
  行列表546.push(`${值规则('SteamCN')}, policy=🎯 全球直连, tag=SteamCN, enabled=true`);
  行列表546.push(`${值规则('Microsoft')}, policy=Ⓜ️ 微软服务, tag=微软, enabled=true`);
  行列表546.push(`${值规则('Apple')}, policy=🍎 苹果服务, tag=苹果, enabled=true`);
  行列表546.push(`${值规则('Telegram')}, policy=📲 电报信息, tag=电报, enabled=true`);
  行列表546.push(`${值规则('OpenAi')}, policy=🤖 OpenAI, tag=OpenAI, enabled=true`);
  行列表546.push(`${值规则('Netflix')}, policy=🌍 国外媒体, tag=Netflix, enabled=true`);
  行列表546.push(`${值规则('YouTube')}, policy=🌍 国外媒体, tag=YouTube, enabled=true`);
  行列表546.push(`${值规则('Disney')}, policy=🌍 国外媒体, tag=Disney, enabled=true`);
  行列表546.push(`${值规则('Spotify')}, policy=🌍 国外媒体, tag=Spotify, enabled=true`);
  行列表546.push(`${值规则('TikTok')}, policy=🌍 国外媒体, tag=TikTok, enabled=true`);
  行列表546.push(`${值规则('BiliBili')}, policy=📺 哔哩哔哩, tag=哔哩哔哩, enabled=true`);
  行列表546.push(`${值规则(解码64('UHJveHlNZWRpYQ=='))}, policy=🌍 国外媒体, tag=${解码64('5Luj55CG5aqS5L2T')}, enabled=true`);
  行列表546.push(`${值规则(解码64('UHJveHlHRldsaXN0'))}, policy=🚀 节点选择, tag=${解码64('5Luj55CG5YiX6KGo')}, enabled=true`);
  行列表546.push(`${值规则('ChinaDomain')}, policy=🎯 全球直连, tag=中国域名, enabled=true`);
  行列表546.push(`${值规则('ChinaIp')}, policy=🎯 全球直连, tag=中国IP, enabled=true`);
  行列表546.push('');
  行列表546.push('[Rule]');
  行列表546.push('GEOIP,CN,🎯 全球直连');
  行列表546.push('FINAL,🐟 漏网之鱼');
  return 行列表546.join('\n');
}

// 内部生成圈叉配置（完整远端 filter 资源）
function 生成值值(链接列表541) {
  const 节点列表 = 链接列表541.map(解析值链接).filter(数量值540 => 数量值540 && (数量值540.proto === 解码64('dmxlc3M=') || 数量值540.proto === 解码64('dHJvamFu')));
  const 名称列表 = 节点列表.map(数量值539 => 数量值539.name);
  const 圈叉基础配置 = 解码64('aHR0cHM6Ly9mYXN0bHkuanNkZWxpdnIubmV0L2doL2JsYWNrbWF0cml4Ny9pb3NfcnVsZV9zY3JpcHRAbWFzdGVyL3J1bGUvUXVhbnR1bXVsdFg=');
  const 行列表538 = ['[general]', 'network_check_url=http://www.gstatic.com/generate_204', 'server_check_url=http://www.gstatic.com/generate_204', 'profile_img_url=https://fastly.jsdelivr.net/gh/byJoey/cfnew@main/snippets/logo.png', 'dns_exclusion_list=*.cmpassport.com, *.jegotrip.com.cn, *.icloud.com, *.icloud.com.cn, *.apple.com, *.weibo.com, *.qq.com', 'running_mode_trigger=filter', '', '[dns]', `server=${(自定义域名系统 || '223.5.5.5').replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`, 'server=119.29.29.29', 'server=https://223.5.5.5/dns-query', 'server=https://1.12.12.12/dns-query', '', '[server_local]'];
  for (const 数量值537 of 节点列表) {
    if (数量值537.proto === 解码64('dmxlc3M=')) {
      const 部分列表536 = [`${数量值537.server}:${数量值537.port}`, `method=none`, `password=${数量值537.uuid}`, `obfs=${数量值537.tls ? 'wss' : 'ws'}`, `obfs-host=${数量值537.host}`, `obfs-uri=${数量值537.path}`];
      if (数量值537.tls) 部分列表536.push(`tls-verification=true`, `tls13=true`);
      部分列表536.push(`tag=${数量值537.name}`);
      行列表538.push(`${解码64('dmxlc3M=')}=${部分列表536.join(', ')}`);
    } else {
      const 部分列表535 = [`${数量值537.server}:${数量值537.port}`, `password=${数量值537.password}`, `over-tls=true`, `tls-host=${数量值537.sni}`, `obfs=wss`, `obfs-host=${数量值537.host}`, `obfs-uri=${数量值537.path}`, `tls-verification=true`, `tag=${数量值537.name}`];
      行列表538.push(`${解码64('dHJvamFu')}=${部分列表535.join(', ')}`);
    }
  }
  行列表538.push('');
  行列表538.push('[policy]');
  const 列表534 = 名称列表.length ? 名称列表.join(', ') : 'direct';
  行列表538.push(`static=🚀 节点选择, ${列表534}, direct, img-url=${解码64('aHR0cHM6Ly9mYXN0bHkuanNkZWxpdnIubmV0L2doL0tvb2xzb24vUXVyZUBtYXN0ZXIvSWNvblNldC9Db2xvci9Qcm94eS5wbmc=')}`);
  行列表538.push(`static=🌍 国外媒体, ${处理值值列表(名称列表)}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ForeignMedia.png`);
  行列表538.push(`static=📺 哔哩哔哩, ${处理值值列表(名称列表, {
    directFirst: true
  })}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/bilibili.png`);
  行列表538.push(`static=📹 油管视频, ${处理值值列表(名称列表, {
    extraGroups: ['🌍 国外媒体']
  })}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png`);
  行列表538.push(`static=🎬 奈飞视频, ${处理值值列表(名称列表, {
    extraGroups: ['🌍 国外媒体']
  })}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png`);
  行列表538.push(`static=📲 电报信息, ${处理值值列表(名称列表)}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png`);
  行列表538.push(`static=🌐 谷歌服务, ${处理值值列表(名称列表)}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Google.png`);
  行列表538.push(`static=🤖 OpenAI, ${处理值值列表(名称列表)}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/ChatGPT.png`);
  行列表538.push(`static=Ⓜ️ 微软服务, ${处理值值列表(名称列表, {
    directFirst: true
  })}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Microsoft.png`);
  行列表538.push(`static=🍎 苹果服务, ${处理值值列表(名称列表, {
    directFirst: true
  })}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Apple.png`);
  行列表538.push(`static=🎯 全球直连, direct, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png`);
  行列表538.push(`static=🛑 全球拦截, reject, direct, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Advertising.png`);
  行列表538.push(`static=🐟 漏网之鱼, ${处理值值列表(名称列表)}, img-url=https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Final.png`);
  行列表538.push('');
  行列表538.push('[filter_remote]');
  行列表538.push(`${圈叉基础配置}/Lan/Lan.list, tag=局域网, force-policy=🎯 全球直连, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Advertising/Advertising.list, tag=广告拦截, force-policy=🛑 全球拦截, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Microsoft/Microsoft.list, tag=微软, force-policy=Ⓜ️ 微软服务, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Apple/Apple.list, tag=苹果, force-policy=🍎 苹果服务, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Telegram/Telegram.list, tag=电报, force-policy=📲 电报信息, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Google/Google.list, tag=谷歌, force-policy=🌐 谷歌服务, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/OpenAI/OpenAI.list, tag=OpenAI, force-policy=🤖 OpenAI, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Claude/Claude.list, tag=Claude, force-policy=🤖 OpenAI, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/YouTube/YouTube.list, tag=YouTube, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Netflix/Netflix.list, tag=Netflix, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Disney/Disney.list, tag=Disney, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Spotify/Spotify.list, tag=Spotify, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/TikTok/TikTok.list, tag=TikTok, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/BiliBili/BiliBili.list, tag=哔哩哔哩, force-policy=📺 哔哩哔哩, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/Global/Global.list, tag=全球加速, force-policy=🚀 节点选择, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push(`${圈叉基础配置}/ChinaMax/ChinaMax.list, tag=中国直连, force-policy=🎯 全球直连, update-interval=86400, opt-parser=false, enabled=true`);
  行列表538.push('');
  行列表538.push('[filter_local]');
  行列表538.push('geoip, cn, 🎯 全球直连');
  行列表538.push('final, 🐟 漏网之鱼');
  return 行列表538.join('\n');
}

// 兼容旧调用名
async function 生成值配置533(链接列表532) {
  return 生成值值589(链接列表532);
}
function 生成值配置531(链接列表530) {
  return 生成值值562(链接列表530);
}
function 生成值配置529(链接列表528) {
  return 生成值值552(链接列表528);
}
function 生成值值配置527(链接列表526) {
  return 生成值值(链接列表526);
}
function 生成值值配置(链接列表525) {
  return 生成值值数据对象(链接列表525);
}
function 生成值配置(链接列表524) {
  return btoa(链接列表524.join('\n'));
}
function 生成值2值配置(链接列表523) {
  return btoa(链接列表523.join('\n'));
}

// 全局变量存储ECH调试信息
let 加密客户端问候调试值 = '';
async function 获取加密客户端问候配置(域名522) {
  if (!启用加密客户端问候) {
    加密客户端问候调试值 = 'ECH功能已禁用';
    return null;
  }
  加密客户端问候调试值 = '';
  const 调试步骤 = [];
  try {
    // 优先使用 Google DNS 查询 cloudflare-ech.com 的 ECH 配置
    调试步骤.push('尝试使用 Google DNS 查询 cloudflare-ech.com...');
    const 加密客户端问候域名网址 = `https://v.recipes/dns/dns.google/dns-query?name=cloudflare-ech.com&type=65`;
    const 加密客户端问候响应 = await fetch(加密客户端问候域名网址, {
      headers: {
        'Accept': 'application/json'
      }
    });
    调试步骤.push(`Google DNS 响应状态: ${加密客户端问候响应.status}`);
    if (加密客户端问候响应.ok) {
      const 加密客户端问候数据 = await 加密客户端问候响应.json();
      调试步骤.push(`Google DNS 返回数据: ${JSON.stringify(加密客户端问候数据).substring(0, 200)}...`);
      if (加密客户端问候数据.Answer && 加密客户端问候数据.Answer.length > 0) {
        调试步骤.push(`找到 ${加密客户端问候数据.Answer.length} 条答案记录`);
        for (const 本地值521 of 加密客户端问候数据.Answer) {
          if (本地值521.data) {
            调试步骤.push(`解析答案数据: ${typeof 本地值521.data}, 长度: ${String(本地值521.data).length}`);
            // Google DNS 返回的数据格式可能不同，需要解析
            const 数据字符串520 = typeof 本地值521.data === 'string' ? 本地值521.data : JSON.stringify(本地值521.data);
            const 加密客户端问候值519 = 数据字符串520.match(/ech=([^\s"']+)/);
            if (加密客户端问候值519 && 加密客户端问候值519[1]) {
              加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n✅ 成功从 Google DNS 获取 ECH 配置';
              return 加密客户端问候值519[1];
            }
            // 如果没有找到，尝试直接使用 data（可能是 base64 编码的）
            if (本地值521.data && !数据字符串520.includes('ech=')) {
              try {
                const 已解码518 = atob(本地值521.data);
                调试步骤.push(`尝试 base64 解码，解码后长度: ${已解码518.length}`);
                const 已解码值517 = 已解码518.match(/ech=([^\s"']+)/);
                if (已解码值517 && 已解码值517[1]) {
                  加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n✅ 成功从 Google DNS (base64解码) 获取 ECH 配置';
                  return 已解码值517[1];
                }
              } catch (事件值516) {
                调试步骤.push(`base64 解码失败: ${事件值516.message}`);
              }
            }
          }
        }
      } else {
        调试步骤.push('Google DNS 未返回答案记录');
      }
    } else {
      调试步骤.push(`Google DNS 请求失败: ${加密客户端问候响应.status}`);
    }

    // 如果 cloudflare-ech.com 查询失败，尝试使用 Google DNS 查询目标域名的 HTTPS 记录
    调试步骤.push(`尝试使用 Google DNS 查询目标域名 ${域名522}...`);
    const 加密域名查询网址 = `https://v.recipes/dns/dns.google/dns-query?name=${encodeURIComponent(域名522)}&type=65`;
    const 响应515 = await fetch(加密域名查询网址, {
      headers: {
        'Accept': 'application/json'
      }
    });
    调试步骤.push(`Google DNS (目标域名) 响应状态: ${响应515.status}`);
    if (响应515.ok) {
      const 数据514 = await 响应515.json();
      调试步骤.push(`Google DNS (目标域名) 返回数据: ${JSON.stringify(数据514).substring(0, 200)}...`);
      if (数据514.Answer && 数据514.Answer.length > 0) {
        调试步骤.push(`找到 ${数据514.Answer.length} 条答案记录`);
        for (const 本地值513 of 数据514.Answer) {
          if (本地值513.data) {
            const 数据字符串 = typeof 本地值513.data === 'string' ? 本地值513.data : JSON.stringify(本地值513.data);
            const 加密客户端问候值512 = 数据字符串.match(/ech=([^\s"']+)/);
            if (加密客户端问候值512 && 加密客户端问候值512[1]) {
              加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n✅ 成功从 Google DNS (目标域名) 获取 ECH 配置';
              return 加密客户端问候值512[1];
            }
            // 尝试 base64 解码
            try {
              const 已解码511 = atob(本地值513.data);
              const 已解码值 = 已解码511.match(/ech=([^\s"']+)/);
              if (已解码值 && 已解码值[1]) {
                加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n✅ 成功从 Google DNS (目标域名, base64解码) 获取 ECH 配置';
                return 已解码值[1];
              }
            } catch (事件值510) {
              调试步骤.push(`base64 解码失败: ${事件值510.message}`);
            }
          }
        }
      } else {
        调试步骤.push('Google DNS (目标域名) 未返回答案记录');
      }
    } else {
      调试步骤.push(`Google DNS (目标域名) 请求失败: ${响应515.status}`);
    }

    // 如果 Google DNS 失败，尝试使用 Cloudflare DNS 作为备选
    调试步骤.push('尝试使用 Cloudflare DNS 作为备选...');
    const 云墙加密客户端问候网址 = `https://cloudflare-dns.com/dns-query?name=cloudflare-ech.com&type=65`;
    const 云墙响应 = await fetch(云墙加密客户端问候网址, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });
    调试步骤.push(`Cloudflare DNS 响应状态: ${云墙响应.status}`);
    if (云墙响应.ok) {
      const 云墙数据 = await 云墙响应.json();
      调试步骤.push(`Cloudflare DNS 返回数据: ${JSON.stringify(云墙数据).substring(0, 200)}...`);
      if (云墙数据.Answer && 云墙数据.Answer.length > 0) {
        调试步骤.push(`找到 ${云墙数据.Answer.length} 条答案记录`);
        for (const 本地值509 of 云墙数据.Answer) {
          if (本地值509.data) {
            const 加密客户端问候值 = 本地值509.data.match(/ech=([^\s"']+)/);
            if (加密客户端问候值 && 加密客户端问候值[1]) {
              加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n✅ 成功从 Cloudflare DNS 获取 ECH 配置';
              return 加密客户端问候值[1];
            }
          }
        }
      } else {
        调试步骤.push('Cloudflare DNS 未返回答案记录');
      }
    } else {
      调试步骤.push(`Cloudflare DNS 请求失败: ${云墙响应.status}`);
    }
    加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n❌ 所有DNS查询均失败，未获取到ECH配置';
    return null;
  } catch (错误508) {
    加密客户端问候调试值 = 调试步骤.join('\\n') + '\\n❌ 获取ECH配置时发生错误: ' + 错误508.message;
    return null;
  }
}
async function 处理订阅请求(请求507, 用户506, 网址505 = null) {
  if (!网址505) 网址505 = new URL(请求507.url);
  const 最终链接列表 = [];
  const 工作器域名504 = 网址505.hostname;
  const 目标503 = 网址505.searchParams.get('target') || 'base64';
  const 别名命名器502 = 创建值节点命名器(false);

  // 如果启用了ECH，使用自定义值
  let 加密客户端问候配置501 = null;
  if (启用加密客户端问候) {
    const 域名系统值500 = 自定义域名系统 || 'https://223.5.5.5/dns-query';
    const 加密客户端问候域名499 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
    加密客户端问候配置501 = `${加密客户端问候域名499}+${域名系统值500}`;
  }
  function 添加节点列表来源列表(列表498) {
    if (启用明文) {
      最终链接列表.push(...生成链接列表来源源(列表498, 用户506, 工作器域名504, 加密客户端问候配置501, false, 别名命名器502));
    }
  }
  if (启用原生地址) {
    if (当前工作器地区 === 'CUSTOM') {
      const 原生列表497 = [{
        ip: 工作器域名504,
        isp: '原生地址'
      }];
      await 添加节点列表来源列表(原生列表497);
    } else {
      try {
        const 原生列表496 = [{
          ip: 工作器域名504,
          isp: '原生地址'
        }];
        await 添加节点列表来源列表(原生列表496);
      } catch (错误495) {
        if (!当前工作器地区) {
          当前工作器地区 = 'CF';
        }
        const 值备用地址494 = await 获取值备用地址(当前工作器地区);
        if (值备用地址494) {
          回退地址 = 值备用地址494.domain + ':' + 值备用地址494.port;
          const 备用列表493 = [{
            ip: 值备用地址494.domain,
            isp: 解码64('UHJveHlJUC0=') + 当前工作器地区
          }];
          await 添加节点列表来源列表(备用列表493);
        } else {
          const 原生列表 = [{
            ip: 工作器域名504,
            isp: '原生地址'
          }];
          await 添加节点列表来源列表(原生列表);
        }
      }
    }
  }
  const 是否有自定义优选 = 自定义优选地址列表.length > 0 || 自定义优选域名列表.length > 0;
  if (禁用优选) {} else if (是否有自定义优选) {
    if (自定义优选地址列表.length > 0 && 启用优选地址) {
      await 添加节点列表来源列表(自定义优选地址列表);
    }
    if (自定义优选域名列表.length > 0 && 启用优选域名) {
      const 自定义域名列表 = 自定义优选域名列表.map(丁值492 => ({
        ip: 丁值492.domain,
        isp: 丁值492.name || 丁值492.domain
      }));
      await 添加节点列表来源列表(自定义域名列表);
    }
  } else {
    if (启用优选域名) {
      const 域名列表 = 直连域名列表.map(丁值491 => ({
        ip: 丁值491.domain,
        isp: 丁值491.name || 丁值491.domain
      }));
      await 添加节点列表来源列表(域名列表);
    }
    if (启用优选地址) {
      if (!优选地址源) {
        try {
          const 值地址列表490 = await 获取值地址列表();
          if (值地址列表490.length > 0) {
            await 添加节点列表来源列表(值地址列表490);
          }
        } catch (错误489) {
          if (!当前工作器地区) {
            当前工作器地区 = 'CF';
          }
          const 值备用地址488 = await 获取值备用地址(当前工作器地区);
          if (值备用地址488) {
            回退地址 = 值备用地址488.domain + ':' + 值备用地址488.port;
            const 备用列表487 = [{
              ip: 值备用地址488.domain,
              isp: 解码64('UHJveHlJUC0=') + 当前工作器地区
            }];
            await 添加节点列表来源列表(备用列表487);
          }
        }
      }
    }
    if (启用仓库优选) {
      try {
        const 新地址列表 = await 获取值解析新地址列表();
        if (新地址列表.length > 0) {
          if (启用明文) {
            最终链接列表.push(...生成链接列表来源新地址列表(新地址列表, 用户506, 工作器域名504, 加密客户端问候配置501, false, 别名命名器502));
          }
        }
      } catch (错误486) {
        if (!当前工作器地区) {
          当前工作器地区 = 'CF';
        }
        const 值备用地址485 = await 获取值备用地址(当前工作器地区);
        if (值备用地址485) {
          回退地址 = 值备用地址485.domain + ':' + 值备用地址485.port;
          const 备用列表 = [{
            ip: 值备用地址485.domain,
            isp: 解码64('UHJveHlJUC0=') + 当前工作器地区
          }];
          await 添加节点列表来源列表(备用列表);
        }
      }
    }
  }
  if (最终链接列表.length === 0) {
    const 错误备注 = "所有节点获取失败";
    const 协议484 = atob('dmxlc3M=');
    const 错误链接 = `${协议484}://00000000-0000-0000-0000-000000000000@127.0.0.1:80?encryption=none&security=none&type=ws&host=error.com&path=%2F#${encodeURIComponent(错误备注)}`;
    最终链接列表.push(错误链接);
  }
  let 订阅内容;
  let 内容类型483 = 'text/plain; charset=utf-8';
  switch (目标503.toLowerCase()) {
    case atob('Y2xhc2g='):
    case atob('Y2xhc2hy'):
    case 解码64('c3Rhc2g='):
    case 'meta':
    case 解码64('Y2xhc2htZXRh'):
      订阅内容 = 生成值值589(最终链接列表);
      内容类型483 = 'text/yaml; charset=utf-8';
      break;
    case atob('c3VyZ2U='):
    case atob('c3VyZ2Uy'):
    case atob('c3VyZ2Uz'):
    case atob('c3VyZ2U0'):
      订阅内容 = 生成值值562(最终链接列表);
      内容类型483 = 'text/plain; charset=utf-8';
      break;
    case atob('cXVhbnR1bXVsdA=='):
    case atob('cXVhbng='):
    case 解码64('cXVhbng='):
      订阅内容 = 生成值值(最终链接列表);
      内容类型483 = 'text/plain; charset=utf-8';
      break;
    case atob('c3M='):
    case atob('c3Ny'):
      订阅内容 = btoa(最终链接列表.join('\n'));
      break;
    case atob('djJyYXk='):
      订阅内容 = btoa(最终链接列表.join('\n'));
      break;
    case atob('bG9vbg=='):
      订阅内容 = 生成值值552(最终链接列表);
      内容类型483 = 'text/plain; charset=utf-8';
      break;
    case atob('c2luZ2JveA=='):
    case 解码64('c2luZy1ib3g='):
    case 解码64('c2luZ2JveA=='):
      订阅内容 = 生成值值数据对象(最终链接列表);
      内容类型483 = 'application/json; charset=utf-8';
      break;
    default:
      订阅内容 = btoa(最终链接列表.join('\n'));
  }
  const 响应头部列表 = {
    'Content-Type': 内容类型483,
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
  };

  // 添加ECH状态到响应头
  if (启用加密客户端问候) {
    响应头部列表['X-ECH-Status'] = 'ENABLED';
    if (加密客户端问候配置501) {
      响应头部列表['X-ECH-Config-Length'] = String(加密客户端问候配置501.length);
    }
  }
  return new Response(订阅内容, {
    headers: 响应头部列表
  });
}
function 生成链接列表来源源(列表482, 用户481, 工作器域名480, 加密客户端问候配置479 = null, 跳过编号478 = false, 别名命名器477 = null) {
  const 云墙超文本端口476 = [80, 8080, 8880, 2052, 2082, 2086, 2095];
  const 云墙安全超文本端口475 = [443, 2053, 2083, 2087, 2096, 8443];
  const 默认安全超文本值474 = [443];
  const 默认超文本值473 = 禁用非传输层安全 ? [] : [80];
  const 链接列表472 = [];
  const 网页套接字路径471 = '/?ed=2048';
  const 协议470 = atob('dmxlc3M=');
  const 制作节点名称469 = 别名命名器477 || 创建值节点命名器(跳过编号478);
  for (const 项目468 of 列表482) {
    const 安全地址467 = 项目468.ip.includes(':') ? `[${项目468.ip}]` : 项目468.ip;
    let 值值生成466 = [];
    if (项目468.port) {
      const 端口465 = 项目468.port;
      if (云墙安全超文本端口475.includes(端口465)) {
        值值生成466.push({
          port: 端口465,
          tls: true
        });
      } else if (云墙超文本端口476.includes(端口465)) {
        if (!禁用非传输层安全) {
          值值生成466.push({
            port: 端口465,
            tls: false
          });
        }
      } else {
        值值生成466.push({
          port: 端口465,
          tls: true
        });
      }
    } else {
      默认安全超文本值474.forEach(端口464 => {
        值值生成466.push({
          port: 端口464,
          tls: true
        });
      });
      默认超文本值473.forEach(端口463 => {
        值值生成466.push({
          port: 端口463,
          tls: false
        });
      });
    }
    for (const {
      port: 端口462,
      tls: 传输层安全461
    } of 值值生成466) {
      const 网页套接字节点名称460 = 制作节点名称469(项目468);
      if (传输层安全461) {
        const 网页套接字参数459 = new URLSearchParams({
          encryption: 'none',
          security: 'tls',
          sni: 工作器域名480,
          fp: 启用加密客户端问候 ? 'chrome' : 'randomized',
          type: 'ws',
          host: 工作器域名480,
          path: 网页套接字路径471
        });
        处理值应用层协议协商值(网页套接字参数459);

        // 如果启用了ECH，添加ech参数（ECH需要伪装成Chrome浏览器）
        if (启用加密客户端问候) {
          const 域名系统值458 = 自定义域名系统 || 'https://223.5.5.5/dns-query';
          const 加密客户端问候域名457 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
          网页套接字参数459.set('ech', `${加密客户端问候域名457}+${域名系统值458}`);
        }
        链接列表472.push(`${协议470}://${用户481}@${安全地址467}:${端口462}?${网页套接字参数459.toString()}#${encodeURIComponent(网页套接字节点名称460)}`);
      } else {
        const 网页套接字参数456 = new URLSearchParams({
          encryption: 'none',
          security: 'none',
          type: 'ws',
          host: 工作器域名480,
          path: 网页套接字路径471
        });
        链接列表472.push(`${协议470}://${用户481}@${安全地址467}:${端口462}?${网页套接字参数456.toString()}#${encodeURIComponent(网页套接字节点名称460)}`);
      }
    }
  }
  return 链接列表472;
}

async function 计算值摘要(文本434) {
  const 缓冲区434 = await crypto.subtle.digest('MD5', new TextEncoder().encode(文本434));
  return Array.from(new Uint8Array(缓冲区434)).map(字节434 => 字节434.toString(16).padStart(2, '0')).join('');
}
async function 获取值地址列表() {
  const 分组线路映射 = {
    ctcc: '电信',
    cucc: '联通',
    cmcc: '移动',
    bgp: '多线',
    ipv6: 'IPv6'
  };
  const 值4已启用 = 获取配置值('ipv4', '') === '' || 获取配置值('ipv4', 'yes') !== 'no';
  const 值6已启用 = 获取配置值('ipv6', '') === '' || 获取配置值('ipv6', 'yes') !== 'no';
  const 值值432 = 获取配置值('ispMobile', '') === '' || 获取配置值('ispMobile', 'yes') !== 'no';
  const 值值431 = 获取配置值('ispUnicom', '') === '' || 获取配置值('ispUnicom', 'yes') !== 'no';
  const 值值430 = 获取配置值('ispTelecom', '') === '' || 获取配置值('ispTelecom', 'yes') !== 'no';
  try {
    const 时间戳434 = String(Date.now());
    const 内层摘要434 = await 计算值摘要(解码64('RGRsVHh0TjBzVU91'));
    const 请求密钥434 = await 计算值摘要(内层摘要434 + 解码64('NzBjbG91ZGZsYXJlYXBpa2V5') + 时间戳434);
    const 响应434 = await fetch(`${解码64('aHR0cHM6Ly9hcGkudW91aW4uY29tL2luZGV4LnBocC9pbmRleC9DbG91ZGZsYXJl')}?key=${请求密钥434}&time=${时间戳434}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    if (!响应434.ok) return [];
    const 数据434 = await 响应434.json();
    const 分组集合434 = 数据434 && 数据434.data;
    if (!分组集合434) return [];
    const 结果列表433 = [];
    for (const 分组名434 of Object.keys(分组线路映射)) {
      const 是否值6434 = 分组名434 === 'ipv6';
      if (是否值6434 && !值6已启用) continue;
      if (!是否值6434 && !值4已启用) continue;
      const 线路名434 = 分组线路映射[分组名434];
      if (线路名434 === '移动' && !值值432) continue;
      if (线路名434 === '联通' && !值值431) continue;
      if (线路名434 === '电信' && !值值430) continue;
      const 分组434 = 分组集合434[分组名434];
      const 条目列表434 = 分组434 && Array.isArray(分组434.info) ? 分组434.info : [];
      for (const 条目434 of 条目列表434) {
        const 地址434 = 规范化节点主机(条目434 && 条目434.ip);
        if (!地址434) continue;
        结果列表433.push({
          isp: 线路名434,
          ip: 地址434,
          colo: ''
        });
      }
    }
    return 结果列表433;
  } catch (事件值427) {}
  return [];
}
async function 处理网页套接字请求(请求417) {
  // 从请求URL的path query中读取客户端自定义参数
  // 从 path query 读取覆盖参数
  const 请求网址 = new URL(请求417.url);
  const 请求回退416 = 请求网址.searchParams.get('p') || '';
  const 请求地区415 = (请求网址.searchParams.get('wk') || '').toUpperCase();
  const 请求值字符串 = 请求网址.searchParams.get('rm') || '';
  const 请求值414 = 请求值字符串 ? 请求值字符串.toLowerCase() !== 'no' : null;
  const 请求代理字符串 = 请求网址.searchParams.get('s') || '';
  let 请求代理配置413 = null;
  if (请求代理字符串) {
    try {
      请求代理配置413 = 解析代理配置(请求代理字符串);
    } catch (忽略值412) {}
  }

  // 检测并设置当前Worker地区，确保WebSocket请求能正确进行就近匹配
  // 优先级：客户端path参数wk > 全局manualWorkerRegion > 自动检测
  let 实际地区411 = 当前工作器地区;
  if (!实际地区411 || 实际地区411 === '') {
    if (请求地区415) {
      实际地区411 = 请求地区415;
    } else if (手动工作器地区 && 手动工作器地区.trim()) {
      实际地区411 = 手动工作器地区.trim().toUpperCase();
    } else {
      实际地区411 = 'CF';
    }
  } else if (请求地区415) {
    实际地区411 = 请求地区415;
  }
  const 网页套接字值 = new WebSocketPair();
  const [客户端值, 值值410] = Object.values(网页套接字值);
  值值410.accept();
  值值410.binaryType = 'arraybuffer';
  let 远程连接值409 = {
    socket: null,
    writer: null,
    drainUpload: null
  };
  let 是否域名系统值 = false;
  let 协议类型 = null;
  let 值值408 = false;
  let 传输值 = false;
  const 值队列 = 创建块队列(传输上传包大小, 传输上传队列上限, 传输上传队列上限 >> 8);
  const 请求值407 = 请求417.fetcher;
  function 处理值远程写入器() {
    try {
      远程连接值409.writer?.releaseLock();
    } catch (忽略值406) {}
    远程连接值409.writer = null;
  }
  function 关闭传输() {
    if (传输值) return;
    传输值 = true;
    值队列.clear();
    处理值远程写入器();
    try {
      远程连接值409.socket?.close();
    } catch (忽略值405) {}
    关闭套接字值(值值410);
  }
  function 处理队列值(块404) {
    const 数据403 = 处理值值8数组(块404);
    if (!数据403.byteLength) return true;
    if (!值队列.sow(数据403)) {
      关闭传输();
      return false;
    }
    远程连接值409.drainUpload();
    return true;
  }
  async function 处理值值402() {
    if (值值408 || 传输值 || !远程连接值409.writer) return;
    值值408 = true;
    try {
      for (;;) {
        if (传输值 || !远程连接值409.writer) break;
        const [数据401] = 值队列.bundle();
        if (!数据401) break;
        await 远程连接值409.writer.write(数据401);
      }
    } catch (忽略值400) {
      关闭传输();
    } finally {
      值值408 = false;
      if (!值队列.empty && !传输值 && 远程连接值409.writer) queueMicrotask(处理值值402);
    }
  }
  远程连接值409.drainUpload = () => {
    if (!值值408 && !值队列.empty && 远程连接值409.writer) queueMicrotask(处理值值402);
  };
  const 值数据399 = 请求417.headers.get(atob('c2VjLXdlYnNvY2tldC1wcm90b2NvbA==')) || '';
  const 本地值398 = 制作值流(值值410, 值数据399);
  本地值398.pipeTo(new WritableStream({
    async write(块397) {
      if (传输值) return;
      const 数据396 = 处理值值8数组(块397);
      if (是否域名系统值) return await 处理值用户数据报(数据396, 值值410, null, 请求值407);
      if (远程连接值409.socket && 远程连接值409.writer) {
        if (!处理队列值(数据396)) throw new Error('upload queue overflow');
        return;
      }
      if (协议类型) {
        if (!处理队列值(数据396)) throw new Error('upload queue overflow');
        return;
      }
      if (!协议类型) {
        if (启用明文 && 数据396.byteLength >= 24) {
          const 轻量协议结果 = 解析网页套接字值头部(数据396, 认证令牌);
          if (!轻量协议结果.hasError) {
            协议类型 = 解码64('dmxlc3M=');
            const {
              addressType: 地址类型395,
              port: 端口394,
              hostname: 主机名393,
              rawIndex: 原始索引,
              version: 本地值392,
              isUDP: 是否用户数据报391
            } = 轻量协议结果;
            if (是否用户数据报391) {
              if (端口394 === 53) 是否域名系统值 = true;else throw new Error(错误_仅支持域名系统用户数据报);
            }
            const 值头部390 = new Uint8Array([本地值392[0], 0]);
            const 原始数据389 = 数据396.subarray(原始索引);
            if (是否域名系统值) return 处理值用户数据报(原始数据389, 值值410, 值头部390, 请求值407);
            await 处理值值384(地址类型395, 主机名393, 端口394, 原始数据389, 值值410, 值头部390, 远程连接值409, 请求回退416, 实际地区411, 请求值414, 请求代理配置413, 请求值407);
            return;
          }
        }
        throw new Error('Invalid protocol or authentication failed');
      }
    }
  })).catch(错误385 => {
    关闭传输();
  });
  return new Response(null, {
    status: 101,
    webSocket: 客户端值
  });
}
async function 处理值值384(地址类型383, 主机, 端口数字, 原始数据, 网页套接字382, 值头部381, 远程连接值, 请求回退 = '', 请求地区 = '', 请求值380 = null, 请求代理配置 = null, 请求值379 = null) {
  // 优先使用客户端path参数，其次回退到全局配置
  const 实际回退 = 请求回退 || 回退地址;
  const 实际地区 = 请求地区 || 当前工作器地区;
  const 实际地区匹配 = 请求值380 !== null ? 请求值380 : 启用地区匹配;
  const 实际代理配置 = 请求代理配置 || 已解析代理5配置;
  const 实际代理已启用 = 请求代理配置 ? true : 是否代理已启用;
  const 值数据378 = 处理值值8数组(原始数据);
  async function 连接值发送(地址377, 端口376, 值代理 = false) {
    // 走代理时首包交给握手函数在释放写入器前发出，避免换写入器导致连接被重置
    const 远程值375 = 值代理 ? await 处理值代理连接(地址类型383, 地址377, 端口376, 实际代理配置, 请求值379, 值数据378) : await 连接值套接字(地址377, 端口376, 请求值379, 传输连接竞速数);
    const 写入器374 = 远程值375.writable.getWriter();
    if (!值代理 && 值数据378.byteLength) await 写入器374.write(值数据378);
    return {
      remoteSock: 远程值375,
      writer: 写入器374
    };
  }
  function 处理值值当前(远程值373, 写入器372) {
    if (远程连接值.socket !== 远程值373) return;
    try {
      写入器372?.releaseLock();
    } catch (忽略值371) {}
    远程连接值.socket = null;
    远程连接值.writer = null;
  }
  function 处理值远程(远程值370, 写入器369, 重试值368) {
    try {
      if (远程连接值.writer && 远程连接值.writer !== 写入器369) {
        远程连接值.writer.releaseLock();
      }
    } catch (忽略值367) {}
    远程连接值.socket = 远程值370;
    远程连接值.writer = 写入器369;
    远程连接值.drainUpload?.();
    远程值370.closed.catch(() => {}).finally(() => {
      if (远程连接值.socket === 远程值370) 关闭套接字值(网页套接字382);
    });
    连接值279(远程值370, 网页套接字382, 值头部381, 重试值368).finally(() => {
      if (远程连接值.socket === 远程值370) {
        try {
          写入器369.releaseLock();
        } catch (忽略值366) {}
        远程连接值.writer = null;
      }
    });
  }
  async function 处理重试连接() {
    // 只走代理：不回落到直连或备用地址，避免出口 IP 泄漏
    if (仅走代理 && 实际代理已启用) {
      关闭套接字值(网页套接字382);
      return;
    }
    // 【自建 VPS SOCKS5/HTTP 节点优先通道】：直连报错（如访问 CF 网站触发 Fast Fail）后，无条件优先走用户自建代理
    if (实际代理已启用) {
      try {
        const {
          remoteSock: 代理套接字,
          writer: 代理写入器
        } = await 连接值发送(主机, 端口数字, true);
        处理值远程(代理套接字, 代理写入器, null);
        return;
      } catch (代理错误) {}
    }
    // 【自建 VPS ProxyIP 节点优先通道】：如果配置了自定义 ProxyIP (p 变量)，直连报错后立即走自建 VPS
    if (实际回退 && 实际回退.trim()) {
      try {
        const 已解析 = 解析地址值端口(实际回退);
        const 备用主机 = 已解析.address;
        const 备用端口 = 已解析.port || 端口数字;
        const {
          remoteSock: 回退套接字,
          writer: 回退写入器
        } = await 连接值发送(备用主机, 备用端口, false);
        处理值远程(回退套接字, 回退写入器, null);
        return;
      } catch (回退错误) {}
    }
    // 【直接断开】：未配置自建 VPS 节点时，直连失败（如遇 CF 阻断）直接关闭连接，不走卡顿的公共备用池
    关闭套接字值(网页套接字382);
  }
  try {
    // 首跳是否走代理：只走代理 → 必走；优先直连 → 不走；其余按代理是否配置
    const 首跳走代理 = 仅走代理 && 实际代理已启用 ? true : 启用代理降级 ? false : 实际代理已启用;
    const {
      remoteSock: 值套接字358,
      writer: 值写入器
    } = await 连接值发送(主机, 端口数字, 首跳走代理);
    处理值远程(值套接字358, 值写入器, () => {
      处理值值当前(值套接字358, 值写入器);
      处理重试连接();
    });
  } catch (错误357) {
    await 处理重试连接();
  }
}
function 处理值值8数组(块356) {
  if (块356 instanceof Uint8Array) return 块356;
  if (块356 instanceof ArrayBuffer) return new Uint8Array(块356);
  if (ArrayBuffer.isView(块356)) return new Uint8Array(块356.buffer, 块356.byteOffset, 块356.byteLength);
  return new Uint8Array(块356);
}
function 拼接值8数组(头部355, 主体354) {
  const 头值353 = 处理值值8数组(头部355);
  const 乙值352 = 处理值值8数组(主体354);
  const 输出351 = new Uint8Array(头值353.byteLength + 乙值352.byteLength);
  输出351.set(头值353);
  输出351.set(乙值352, 头值353.byteLength);
  return 输出351;
}
function 创建块队列(本地值350, 值值349 = 本地值350, 项目列表上限 = Math.max(1, 值值349 >> 8)) {
  let 队列 = [];
  let 头部348 = 0;
  let 值字节347 = 0;
  let 值缓冲346 = null;
  function 处理本地值345() {
    if (头部348 > 32 && 头部348 * 2 >= 队列.length) {
      队列 = 队列.slice(头部348);
      头部348 = 0;
    }
  }
  function 处理本地值344() {
    if (头部348 >= 队列.length) return null;
    const 数据343 = 队列[头部348];
    队列[头部348++] = undefined;
    值字节347 -= 数据343.byteLength;
    处理本地值345();
    return 数据343;
  }
  return {
    get empty() {
      return 头部348 >= 队列.length;
    },
    clear() {
      队列 = [];
      头部348 = 0;
      值字节347 = 0;
    },
    sow(数据342) {
      const 数量值 = 数据342?.byteLength || 0;
      if (!数量值) return true;
      if (值字节347 + 数量值 > 值值349 || 队列.length - 头部348 >= 项目列表上限) return false;
      队列.push(数据342);
      值字节347 += 数量值;
      return true;
    },
    bundle(数据341 = null) {
      数据341 ||= 处理本地值344();
      if (!数据341 || 头部348 >= 队列.length || 数据341.byteLength >= 本地值350) return [数据341, false];
      let 本地值340 = 数据341.byteLength;
      let 结束 = 头部348;
      while (结束 < 队列.length) {
        const 本地值339 = 队列[结束];
        const 值值338 = 本地值340 + 本地值339.byteLength;
        if (值值338 > 本地值350) break;
        本地值340 = 值值338;
        结束++;
      }
      if (结束 === 头部348) return [数据341, false];
      const 输出 = 值缓冲346 ||= new Uint8Array(本地值350);
      输出.set(数据341);
      let 偏移337 = 数据341.byteLength;
      while (头部348 < 结束) {
        const 本地值336 = 队列[头部348];
        队列[头部348++] = undefined;
        值字节347 -= 本地值336.byteLength;
        输出.set(本地值336, 偏移337);
        偏移337 += 本地值336.byteLength;
      }
      处理本地值345();
      return [输出.subarray(0, 本地值340), true];
    }
  };
}
function 创建值值(网页套接字335) {
  const 本地值334 = 传输下载包大小;
  const 尾部 = 传输下载尾部;
  const 值值333 = Math.max(4096, 尾部 << 3);
  let 本地值332 = new Uint8Array(本地值334);
  let 值字节 = 0;
  let 计时器 = 0;
  let 值值331 = false;
  let 本地值330 = 0;
  let 值键 = 0;
  let 值值329 = 0;
  function 刷新() {
    if (计时器) clearTimeout(计时器);
    计时器 = 0;
    值值331 = false;
    if (!值字节) return;
    if (网页套接字335.readyState === 1) 网页套接字335.send(本地值332.subarray(0, 值字节).slice());
    本地值332 = new Uint8Array(本地值334);
    值字节 = 0;
    值值329 = 0;
  }
  function 处理本地值() {
    if (计时器 || 值值331) return;
    值值331 = true;
    值键 = 本地值330;
    queueMicrotask(() => {
      值值331 = false;
      if (!值字节 || 计时器) return;
      if (本地值334 - 值字节 < 尾部) return 刷新();
      计时器 = setTimeout(() => {
        计时器 = 0;
        if (!值字节) return;
        if (本地值334 - 值字节 < 尾部) return 刷新();
        if (值值329 < 2 && (本地值330 !== 值键 || 值字节 < 值值333)) {
          值值329++;
          值键 = 本地值330;
          return 处理本地值();
        }
        刷新();
      }, Math.max(传输下载延迟, 1));
    });
  }
  return {
    send(块328) {
      const 数据327 = 处理值值8数组(块328);
      let 偏移326 = 0;
      const 本地值325 = 数据327.byteLength;
      if (!本地值325) return;
      while (偏移326 < 本地值325) {
        if (!值字节 && 本地值325 - 偏移326 >= 本地值334) {
          const 大小324 = Math.min(本地值334, 本地值325 - 偏移326);
          if (网页套接字335.readyState === 1) 网页套接字335.send(偏移326 || 大小324 !== 本地值325 ? 数据327.subarray(偏移326, 偏移326 + 大小324) : 数据327);
          偏移326 += 大小324;
          continue;
        }
        const 大小323 = Math.min(本地值334 - 值字节, 本地值325 - 偏移326);
        本地值332.set(数据327.subarray(偏移326, 偏移326 + 大小323), 值字节);
        值字节 += 大小323;
        偏移326 += 大小323;
        本地值330++;
        if (值字节 === 本地值334 || 本地值334 - 值字节 < 尾部) 刷新();else 处理本地值();
      }
    },
    flush: 刷新
  };
}
function 处理打开值套接字(地址322, 端口321, 请求值320 = null) {
  const 目标 = {
    hostname: 地址322,
    port: 端口321
  };
  if (请求值320 && typeof 请求值320.connect === 'function') return 请求值320.connect(目标);
  return 连接(目标);
}
async function 处理打开值套接字值(地址319, 端口318, 请求值317 = null) {
  try {
    const 套接字316 = 处理打开值套接字(地址319, 端口318, 请求值317);
    if (套接字316?.opened) await 套接字316.opened;
    return 套接字316;
  } catch (错误315) {
    if (!请求值317) throw 错误315;
    const 套接字314 = 连接({
      hostname: 地址319,
      port: 端口318
    });
    if (套接字314?.opened) await 套接字314.opened;
    return 套接字314;
  }
}
async function 连接值套接字(地址313, 端口312, 请求值311 = null, 竞速数量 = 1) {
  const 数量 = Math.max(1, 竞速数量 | 0);
  if (数量 <= 1) return 处理打开值套接字值(地址313, 端口312, 请求值311);
  const 本地值310 = Array.from({
    length: 数量
  }, () => 处理打开值套接字值(地址313, 端口312, 请求值311));
  const 本地值309 = await Promise.any(本地值310);
  本地值310.forEach(本地值308 => {
    本地值308.then(套接字307 => {
      if (套接字307 !== 本地值309) {
        try {
          套接字307.close();
        } catch (忽略值306) {}
      }
    }, () => {});
  });
  return 本地值309;
}
function 获取唯一标识字节(令牌305) {
  if (唯一标识字节缓存.has(令牌305)) return 唯一标识字节缓存.get(令牌305);
  const 十六进制 = String(令牌305 || '').replace(/-/g, '');
  if (十六进制.length !== 32) return null;
  const 字节304 = new Uint8Array(16);
  for (let 索引值303 = 0; 索引值303 < 16; 索引值303++) {
    const 值302 = Number.parseInt(十六进制.slice(索引值303 * 2, 索引值303 * 2 + 2), 16);
    if (Number.isNaN(值302)) return null;
    字节304[索引值303] = 值302;
  }
  if (唯一标识字节缓存.size > 16) 唯一标识字节缓存.clear();
  唯一标识字节缓存.set(令牌305, 字节304);
  return 字节304;
}
function 处理值唯一标识(字节301, 偏移300, 令牌299) {
  const 标识298 = 获取唯一标识字节(令牌299);
  return !!标识298 && 字节301[偏移300] === 标识298[0] && 字节301[偏移300 + 1] === 标识298[1] && 字节301[偏移300 + 2] === 标识298[2] && 字节301[偏移300 + 3] === 标识298[3] && 字节301[偏移300 + 4] === 标识298[4] && 字节301[偏移300 + 5] === 标识298[5] && 字节301[偏移300 + 6] === 标识298[6] && 字节301[偏移300 + 7] === 标识298[7] && 字节301[偏移300 + 8] === 标识298[8] && 字节301[偏移300 + 9] === 标识298[9] && 字节301[偏移300 + 10] === 标识298[10] && 字节301[偏移300 + 11] === 标识298[11] && 字节301[偏移300 + 12] === 标识298[12] && 字节301[偏移300 + 13] === 标识298[13] && 字节301[偏移300 + 14] === 标识298[14] && 字节301[偏移300 + 15] === 标识298[15];
}
function 解析网页套接字值头部(块297, 令牌) {
  const 字节296 = 处理值值8数组(块297);
  if (字节296.byteLength < 24) return {
    hasError: true,
    message: 错误_无效数据
  };
  const 本地值295 = 字节296.subarray(0, 1);
  if (!处理值唯一标识(字节296, 1, 令牌)) return {
    hasError: true,
    message: 错误_无效用户
  };
  const 值长度294 = 字节296[17];
  const 命令索引 = 18 + 值长度294;
  if (字节296.byteLength < 命令索引 + 5) return {
    hasError: true,
    message: 错误_无效数据
  };
  const 命令293 = 字节296[命令索引];
  let 是否用户数据报 = false;
  if (命令293 === 1) {} else if (命令293 === 2) {
    是否用户数据报 = true;
  } else {
    return {
      hasError: true,
      message: 错误_不支持命令
    };
  }
  const 端口索引292 = 19 + 值长度294;
  const 端口291 = 字节296[端口索引292] << 8 | 字节296[端口索引292 + 1];
  let 地址索引290 = 端口索引292 + 2,
    地址长度289 = 0,
    地址值索引 = 地址索引290 + 1,
    主机名288 = '';
  const 地址类型287 = 字节296[地址索引290];
  switch (地址类型287) {
    case 地址类型_四版:
      地址长度289 = 4;
      if (字节296.byteLength < 地址值索引 + 地址长度289) return {
        hasError: true,
        message: 错误_无效数据
      };
      主机名288 = `${字节296[地址值索引]}.${字节296[地址值索引 + 1]}.${字节296[地址值索引 + 2]}.${字节296[地址值索引 + 3]}`;
      break;
    case 地址类型_网址:
      if (字节296.byteLength < 地址值索引 + 1) return {
        hasError: true,
        message: 错误_无效数据
      };
      地址长度289 = 字节296[地址值索引++];
      if (字节296.byteLength < 地址值索引 + 地址长度289) return {
        hasError: true,
        message: 错误_无效数据
      };
      主机名288 = 共享解码器.decode(字节296.subarray(地址值索引, 地址值索引 + 地址长度289));
      break;
    case 地址类型_六版:
      地址长度289 = 16;
      if (字节296.byteLength < 地址值索引 + 地址长度289) return {
        hasError: true,
        message: 错误_无效数据
      };
      const 值6286 = [];
      const 值6视图 = new DataView(字节296.buffer, 字节296.byteOffset + 地址值索引, 地址长度289);
      for (let 索引值285 = 0; 索引值285 < 8; 索引值285++) 值6286.push(值6视图.getUint16(索引值285 * 2).toString(16));
      主机名288 = 值6286.join(':');
      break;
    default:
      return {
        hasError: true,
        message: `${错误_无效地址类型}: ${地址类型287}`
      };
  }
  if (!主机名288) return {
    hasError: true,
    message: `${错误_空地址}: ${地址类型287}`
  };
  return {
    hasError: false,
    addressType: 地址类型287,
    port: 端口291,
    hostname: 主机名288,
    isUDP: 是否用户数据报,
    rawIndex: 地址值索引 + 地址长度289,
    version: 本地值295
  };
}
function 制作值流(套接字284, 值数据头部) {
  let 本地值283 = false;
  return new ReadableStream({
    start(控制器282) {
      套接字284.addEventListener('message', 事件 => {
        if (!本地值283) 控制器282.enqueue(处理值值8数组(事件.data));
      });
      套接字284.addEventListener('close', () => {
        if (!本地值283) {
          关闭套接字值(套接字284);
          控制器282.close();
        }
      });
      套接字284.addEventListener('error', 错误281 => 控制器282.error(错误281));
      const {
        earlyData: 值数据,
        error: 错误280
      } = 处理基础64值数组(值数据头部);
      if (错误280) 控制器282.error(错误280);else if (值数据) 控制器282.enqueue(处理值值8数组(值数据));
    },
    cancel() {
      本地值283 = true;
      关闭套接字值(套接字284);
    }
  });
}
async function 连接值279(远程套接字, 网页套接字278, 头部数据, 重试值) {
  let 头部277 = 头部数据,
    是否有数据 = false,
    本地值276 = false;

  // 关键：直连有时握手成功但远端长时间无数据，需要超时触发降级
  let 首次字节计时器 = null;
  if (重试值) {
    首次字节计时器 = setTimeout(() => {
      if (!是否有数据 && !本地值276) {
        本地值276 = true;
        try {
          远程套接字.close && 远程套接字.close();
        } catch (忽略值275) {}
        重试值();
      }
    }, 首字节超时);
  }
  const 本地值274 = 创建值值(网页套接字278);
  let 读取器273 = null;
  let 本地值272 = true;
  let 缓冲271 = new ArrayBuffer(传输块大小);
  try {
    try {
      读取器273 = 远程套接字.readable.getReader({
        mode: 'byob'
      });
    } catch (忽略值270) {
      本地值272 = false;
      读取器273 = 远程套接字.readable.getReader();
    }
    for (;;) {
      const 结果269 = 本地值272 ? await 读取器273.read(new Uint8Array(缓冲271, 0, 传输块大小)) : await 读取器273.read();
      if (结果269.done) break;
      const 读取值 = 结果269.value;
      let 块268 = 处理值值8数组(读取值);
      const 值缓冲 = 本地值272 && 读取值?.buffer instanceof ArrayBuffer && 读取值.buffer.byteLength >= 传输块大小 ? 读取值.buffer : new ArrayBuffer(传输块大小);
      if (!块268.byteLength) continue;
      if (!是否有数据) {
        是否有数据 = true;
        if (首次字节计时器) {
          clearTimeout(首次字节计时器);
          首次字节计时器 = null;
        }
      }
      if (网页套接字278.readyState !== 1) throw new Error(错误_网页套接字未打开);
      if (头部277) {
        块268 = 拼接值8数组(头部277, 块268);
        头部277 = null;
      }
      if (块268.byteLength >= 传输块大小 >> 1) {
        本地值274.flush();
        网页套接字278.send(块268);
        if (本地值272) 缓冲271 = new ArrayBuffer(传输块大小);
      } else {
        本地值274.send(块268.slice());
        if (本地值272) 缓冲271 = 值缓冲;
      }
    }
    本地值274.flush();
  } catch (错误267) {
    // 已经触发 retry 时不要关闭 WS（retry 会重新挂载新 socket）
    if (!本地值276) 关闭套接字值(网页套接字278);
  } finally {
    try {
      本地值274.flush();
    } catch (忽略值266) {}
    try {
      读取器273?.releaseLock();
    } catch (忽略值265) {}
  }
  if (首次字节计时器) {
    clearTimeout(首次字节计时器);
    首次字节计时器 = null;
  }
  if (!是否有数据 && !本地值276 && 重试值) 重试值();
}
async function 处理值用户数据报(用户数据报块, 网页套接字, 值头部, 请求值 = null) {
  try {
    const 值套接字 = await 连接值套接字('8.8.4.4', 53, 请求值, 1);
    let 头部 = 值头部;
    const 写入器264 = 值套接字.writable.getWriter();
    await 写入器264.write(用户数据报块);
    写入器264.releaseLock();
    await 连接值279(值套接字, 网页套接字, 头部, null);
  } catch (错误263) {}
}
async function 处理值代理连接(地址类型, 地址262, 端口261, 代理配置 = 已解析代理5配置, 请求值258 = null, 首包数据 = null) {
  // 按代理种类分派：隧道走建隧请求，其余保持套接字5 握手
  if (代理配置 && (代理配置.kind === 代理种类_隧道 || 代理配置.kind === 代理种类_安全隧道)) {
    return 处理值隧道连接(地址262, 端口261, 代理配置, 请求值258, 首包数据);
  }
  const {
    username: 本地值260,
    password: 密码259,
    hostname: 主机名258,
    socksPort: 代理端口257
  } = 代理配置;
  // 优先用请求自带的 fetcher 建连，回退到全局连接
  const 套接字256 = 处理打开值套接字(主机名258, 代理端口257, 请求值258);
  const 写入器255 = 套接字256.writable.getWriter();
  await 写入器255.write(new Uint8Array(本地值260 ? [5, 2, 0, 2] : [5, 1, 0]));
  const 读取器254 = 套接字256.readable.getReader();
  // 响应可能分片到达，按需累积到足够长度再解析；残留字节留给下一步
  let 残留字节 = new Uint8Array(0);
  async function 读满(需要长度) {
    while (残留字节.length < 需要长度) {
      const { value: 分片, done: 已结束 } = await 读取器254.read();
      if (已结束 || !分片) throw new Error(错误_代理连接失败);
      残留字节 = 拼接值8数组(残留字节, 分片);
    }
    return 残留字节;
  }
  function 取走(长度) {
    const 结果 = 残留字节.subarray(0, 长度);
    残留字节 = 残留字节.subarray(长度);
    return 结果;
  }
  let 本地值253 = await 读满(2);
  if (本地值253[0] !== 5 || 本地值253[1] === 255) throw new Error(错误_代理无可用方法);
  const 选中方法 = 本地值253[1];
  取走(2);
  if (选中方法 === 2) {
    if (!本地值260 || !密码259) throw new Error(错误_代理需要认证);
    const 编码器252 = new TextEncoder();
    const 认证请求 = new Uint8Array([1, 本地值260.length, ...编码器252.encode(本地值260), 密码259.length, ...编码器252.encode(密码259)]);
    await 写入器255.write(认证请求);
    本地值253 = await 读满(2);
    if (本地值253[0] !== 1 || 本地值253[1] !== 0) throw new Error(错误_代理认证失败);
    取走(2);
  }
  // 统一用域名型寻址，交给代理自己解析更稳。
  const 编码器251 = new TextEncoder();
  const 目标字节 = 编码器251.encode(规范化目标地址(地址262));
  const 本地值250 = new Uint8Array([3, 目标字节.length, ...目标字节]);
  await 写入器255.write(new Uint8Array([5, 1, 0, ...本地值250, 端口261 >> 8, 端口261 & 255]));
  // 连接应答长度随绑定地址类型而变，先读固定的 4 字节头再按类型补齐
  本地值253 = await 读满(4);
  if (本地值253[1] !== 0) throw new Error(错误_代理连接失败);
  const 绑定地址类型 = 本地值253[3];
  let 应答长度;
  if (绑定地址类型 === 1) {
    应答长度 = 10;
  } else if (绑定地址类型 === 4) {
    应答长度 = 22;
  } else if (绑定地址类型 === 3) {
    应答长度 = 7 + (await 读满(5))[4];
  } else {
    throw new Error(错误_代理响应异常);
  }
  await 读满(应答长度);
  取走(应答长度);
  // 首包必须在释放写入器之前发出，与握手共用同一个写入器
  if (首包数据 && 首包数据.byteLength) await 写入器255.write(首包数据);
  写入器255.releaseLock();
  读取器254.releaseLock();
  // 应答之后若已捎带目标数据，重新挂回流首部，避免丢首包
  if (残留字节.length) return 包装残留套接字(套接字256, 残留字节);
  return 套接字256;
}
// 六版地址在域名型寻址里不带方括号
function 规范化目标地址(地址234值) {
  const 文本 = String(地址234值 || '');
  return /^\[.*\]$/.test(文本) ? 文本.slice(1, -1) : 文本;
}
async function 处理值隧道连接(地址238值, 端口237值, 代理配置, 请求值236值 = null, 首包数据235值 = null) {
  const {
    username: 隧道用户,
    password: 隧道密码,
    hostname: 隧道主机,
    socksPort: 隧道端口,
    kind: 隧道种类
  } = 代理配置;
  const 连接选项 = 隧道种类 === 代理种类_安全隧道 ? {
    secureTransport: 'on',
    allowHalfOpen: false
  } : undefined;
  const 目标参数 = {
    hostname: 隧道主机,
    port: 隧道端口
  };
  // 优先用请求自带的 fetcher 建连，回退到全局连接
  const 套接字 = 请求值236值 && typeof 请求值236值.connect === 'function' ? (连接选项 === undefined ? 请求值236值.connect(目标参数) : 请求值236值.connect(目标参数, 连接选项)) : 连接(目标参数, 连接选项);
  if (套接字?.opened) await 套接字.opened;
  // IPv6 目标在请求行里要带方括号
  const 目标主机 = 地址238值.includes(':') && !/^\[.*\]$/.test(地址238值) ? `[${地址238值}]` : 地址238值;
  const 目标地址 = `${目标主机}:${端口237值}`;
  let 请求头 = `${文本_连接方法} ${目标地址}${文本_协议版本}${文本_换行}` + `${文本_主机头}${目标地址}${文本_换行}` + `${文本_用户代理头}${文本_换行}` + `${文本_代理保持}${文本_换行}`;
  if (隧道用户) {
    请求头 += `${文本_代理认证头}${btoa(`${隧道用户}:${隧道密码 || ''}`)}${文本_换行}`;
  }
  请求头 += 文本_换行;
  const 写入器 = 套接字.writable.getWriter();
  const 读取器 = 套接字.readable.getReader();
  try {
    await 写入器.write(new TextEncoder().encode(请求头));
    // 响应可能分片到达，累积到头部结束（空行）为止
    const 分隔 = [13, 10, 13, 10];
    let 缓冲 = new Uint8Array(0);
    let 头部结束 = -1;
    while (头部结束 < 0) {
      const {
        value: 分片,
        done: 已结束
      } = await 读取器.read();
      if (已结束 || !分片) throw new Error(错误_代理隧道失败);
      缓冲 = 拼接值8数组(缓冲, 分片);
      for (let 位置 = 0; 位置 + 3 < 缓冲.length; 位置++) {
        if (缓冲[位置] === 分隔[0] && 缓冲[位置 + 1] === 分隔[1] && 缓冲[位置 + 2] === 分隔[2] && 缓冲[位置 + 3] === 分隔[3]) {
          头部结束 = 位置 + 4;
          break;
        }
      }
      if (头部结束 < 0 && 缓冲.length > 8192) throw new Error(错误_代理响应异常);
    }
    const 状态行 = 共享解码器.decode(缓冲.subarray(0, Math.min(头部结束, 128)));
    if (!状态行.startsWith(文本_响应前缀)) throw new Error(错误_代理响应异常);
    const 状态码 = Number(状态行.split(' ')[1]);
    if (!(状态码 >= 200 && 状态码 < 300)) throw new Error(错误_代理隧道失败);
    // 代理在头部之后可能已经捎带了目标数据，需要交还给下游
    const 残留数据 = 缓冲.subarray(头部结束);
    // 首包在释放写入器之前发出
    if (首包数据235值 && 首包数据235值.byteLength) await 写入器.write(首包数据235值);
    写入器.releaseLock();
    读取器.releaseLock();
    if (残留数据.byteLength) return 包装残留套接字(套接字, 残留数据);
    return 套接字;
  } catch (隧道错误) {
    try {
      写入器.releaseLock();
    } catch (忽略隧道1) {}
    try {
      读取器.releaseLock();
    } catch (忽略隧道2) {}
    try {
      套接字.close();
    } catch (忽略隧道3) {}
    throw 隧道错误;
  }
}
// 把建隧响应里捎带的目标数据重新挂回可读流首部
function 包装残留套接字(套接字, 残留数据) {
  let 上游读取器 = null;
  const 新可读 = new ReadableStream({
    start(控制器) {
      控制器.enqueue(残留数据);
      上游读取器 = 套接字.readable.getReader();
    },
    async pull(控制器) {
      const {
        value: 分片,
        done: 已结束
      } = await 上游读取器.read();
      if (已结束) {
        控制器.close();
        return;
      }
      控制器.enqueue(分片);
    },
    cancel(原因) {
      try {
        上游读取器?.cancel(原因);
      } catch (忽略取消) {}
    }
  });
  return {
    readable: 新可读,
    writable: 套接字.writable,
    closed: 套接字.closed,
    opened: 套接字.opened,
    close: () => 套接字.close()
  };
}
function 解析代理配置(地址249) {
  let 剩余地址 = String(地址249 || '').trim();
  // 按前缀识别代理种类，无前缀保持原有行为（套接字5）
  let 代理种类 = 代理种类_套接字5;
  const 小写地址 = 剩余地址.toLowerCase();
  if (小写地址.startsWith(前缀_安全超文本)) {
    代理种类 = 代理种类_安全隧道;
    剩余地址 = 剩余地址.slice(前缀_安全超文本.length);
  } else if (小写地址.startsWith(前缀_超文本)) {
    代理种类 = 代理种类_隧道;
    剩余地址 = 剩余地址.slice(前缀_超文本.length);
  } else if (小写地址.startsWith(前缀_套接字5)) {
    剩余地址 = 剩余地址.slice(前缀_套接字5.length);
  } else if (小写地址.startsWith(前缀_套接字)) {
    剩余地址 = 剩余地址.slice(前缀_套接字.length);
  }
  // 去掉可能存在的尾部路径，只留 认证@主机:端口
  const 路径位置 = 剩余地址.indexOf('/');
  if (路径位置 >= 0) 剩余地址 = 剩余地址.slice(0, 路径位置);
  if (!剩余地址) throw new Error(错误_无效代理地址);
  let [本地值248, 本地值247] = 剩余地址.split("@").reverse();
  let 本地值246, 密码245, 主机名244, 代理端口;
  if (本地值247) {
    const 本地值243 = 本地值247.split(":");
    if (本地值243.length !== 2) throw new Error(错误_无效代理地址);
    [本地值246, 密码245] = 本地值243;
  }
  const 本地值242 = 本地值248.split(":");
  const 末段值 = 本地值242.pop();
  代理端口 = Number(末段值);
  // 隧道模式允许省略端口，按明文 80 / 安全 443 兜底
  if (isNaN(代理端口)) {
    if (代理种类 === 代理种类_套接字5) throw new Error(错误_无效代理地址);
    本地值242.push(末段值);
    代理端口 = 代理种类 === 代理种类_安全隧道 ? 443 : 80;
  }
  主机名244 = 本地值242.join(":");
  if (!主机名244) throw new Error(错误_无效代理地址);
  if (主机名244.includes(":") && !/^\[.*\]$/.test(主机名244)) throw new Error(错误_无效代理地址);
  return {
    username: 本地值246,
    password: 密码245,
    hostname: 主机名244,
    socksPort: 代理端口,
    kind: 代理种类
  };
}
async function 处理订阅值(请求241, 用户240 = null) {
  if (!用户240) 用户240 = 认证令牌;
  const 网址239 = new URL(请求241.url);
  // 优先检查Cookie中的语言设置
  const 凭据头部 = 请求241.headers.get('Cookie') || '';
  let 语言来源凭据 = null;
  if (凭据头部) {
    const 本地值238 = 凭据头部.split(';').map(丙值237 => 丙值237.trim());
    for (const 凭据 of 本地值238) {
      if (凭据.startsWith('preferredLanguage=')) {
        语言来源凭据 = 凭据.split('=')[1];
        break;
      }
    }
  }
  let 是否值236 = false;
  if (语言来源凭据 === 'fa' || 语言来源凭据 === 'fa-IR') {
    是否值236 = true;
  } else if (语言来源凭据 === 'zh' || 语言来源凭据 === 'zh-CN') {
    是否值236 = false;
  } else {
    // 如果没有Cookie，使用浏览器语言检测
    const 接受语言 = 请求241.headers.get('Accept-Language') || '';
    const 浏览器语言 = 接受语言.split(',')[0].split('-')[0].toLowerCase();
    是否值236 = 浏览器语言 === 'fa' || 接受语言.includes('fa-IR') || 接受语言.includes('fa');
  }
  const 语言值 = 是否值236 ? 'fa-IR' : 'zh-CN';
  const 本地值235 = {
    zh: {
      title: 解码64('6K6i6ZiF5Lit5b+D'),
      subtitle: '多客户端支持 • 智能优选 • 一键生成',
      selectClient: '[ 选择客户端 ]',
      configManagement: '[ 配置管理 ]',
      kvStatusChecking: '检测KV状态中...',
      kvEnabled: '✅ KV存储已启用，可以使用配置管理功能',
      kvDisabled: '⚠️ KV存储未启用或未配置',
      specifyRegion: '指定地区 (wk):',
      autoDetect: 解码64('5a6Y5pa555u06L+e'),
      saveRegion: '保存地区配置',
      protocolSelection: 解码64('5Y2P6K6u6YCJ5oupOg=='),
      enableProtoV: 解码64('5ZCv55SoIFZMRVNTIOWNj+iurg=='),
      customPath: '自定义路径 (d):',
      customIP: 解码64('6Ieq5a6a5LmJUHJveHlJUCAocCk6'),
      preferredIPs: '优选IP列表 (yx):',
      preferredIPsURL: '优选IP来源URL (yxURL):',
      socks5Config: 解码64('5Luj55CG6YWN572uIChzKTo='),
      saveConfig: '保存配置',
      advancedControl: '高级控制',
      builtinPreferred: '内置优选类型:',
      enablePreferredDomain: '启用优选域名',
      enablePreferredIP: '启用优选 IP',
      enableNativeAddress: '启用原生地址',
      enableGitHubPreferred: '启用自定义优选',
      allowAPIManagement: '允许API管理 (ae):',
      regionMatching: '地区匹配 (rm):',
      downgradeControl: 解码64('5Ye656uZ5pa55byPIChxaik6'),
      tlsControl: 'TLS控制 (dkby):',
      preferredControl: '优选控制 (yxby):',
      saveAdvanced: '保存高级配置',
      loading: '加载中...',
      currentConfig: '📍 当前路径配置',
      refreshConfig: '刷新配置',
      resetConfig: '重置配置',
      subscriptionCopied: 解码64('6K6i6ZiF6ZO+5o6l5bey5aSN5Yi2'),
      autoSubscriptionCopied: 解码64('6Ieq5Yqo6K+G5Yir6K6i6ZiF6ZO+5o6l5bey5aSN5Yi277yM5a6i5oi356uv6K6/6Zeu5pe25Lya5qC55o2uVXNlci1BZ2VudOiHquWKqOivhuWIq+W5tui/lOWbnuWvueW6lOagvOW8jw=='),
      protocolHint: '• VLESS WS: 基于 WebSocket 的标准传输协议',
      enableECH: '启用 ECH (Encrypted Client Hello)',
      enableECHHint: 解码64('5ZCv55So5ZCO77yM5q+P5qyh5Yi35paw6K6i6ZiF5pe25Lya6Ieq5Yqo5LuOIERvSCDojrflj5bmnIDmlrDnmoQgRUNIIOmFjee9ruW5tua3u+WKoOWIsOmTvuaOpeS4rQ=='),
      customDNS: '自定义 DNS 服务器',
      customDNSPlaceholder: '例如: https://223.5.5.5/dns-query',
      customDNSHint: '用于ECH配置查询的DNS服务器地址（DoH格式）',
      customECHDomain: '自定义 ECH 域名',
      customECHDomainPlaceholder: '例如: cloudflare-ech.com',
      customECHDomainHint: 'ECH配置中使用的域名，留空则使用默认值',
      alpn: 'TLS ALPN',
      alpnDefault: '默认（留空，由客户端协商）',
      alpnHint: '仅添加到 TLS 节点链接参数；留空则不写 alpn。',
      saveProtocol: 解码64('5L+d5a2Y5Y2P6K6u6YWN572u'),
      builtinPreferredHint: 解码64('5o6n5Yi26K6i6ZiF5Lit5YyF5ZCr5ZOq5Lqb5YaF572u5LyY6YCJ6IqC54K544CC6buY6K6k5YWo6YOo5ZCv55So44CC'),
      apiEnabledDefault: '默认（关闭API）',
      apiEnabledYes: '开启API管理',
      apiEnabledHint: '⚠️ 安全提醒：开启后允许通过API动态添加优选IP。建议仅在需要时开启。',
      regionMatchingDefault: '默认（启用地区匹配）',
      regionMatchingNo: '关闭地区匹配',
      regionMatchingHint: '设置为"关闭"时不进行地区智能匹配',
      downgradeControlDefault: 解码64('5LyY5YWI6LWw5Luj55CG77yI6buY6K6k77yJ'),
      downgradeControlNo: 解码64('5LyY5YWI55u06L+e77yM5aSx6LSl5YaN6LWw5Luj55CG'),
      downgradeControlOnly: 解码64('5Y+q6LWw5Luj55CG77yM5LiN5Zue6JC9'),
      downgradeControlHint: 解码64('5rKh5aGr5Luj55CG5pe25LiJ5Liq6YCJ6aG56YO95LiA5qC377yM6YO95piv55u06L+e44CC5Y+q6LWw5Luj55CG5pe26L+e5LiN5LiK5bCx5pat5byA77yM5Ye65Y+jIElQIOS4jeS8mua8jw=='),
      tlsControlDefault: '默认（保留所有节点）',
      tlsControlYes: '仅TLS节点',
      tlsControlHint: '设置为"仅TLS节点"时只生成带TLS的节点，不生成非TLS节点（如80端口）',
      preferredControlDefault: '默认（启用优选）',
      preferredControlYes: '关闭优选',
      preferredControlHint: '设置为"关闭优选"时只使用原生地址，不生成优选IP和域名节点',
      regionNames: {
        CF: 解码64('8J+MkCDlrpjmlrnnm7Tov54='),
        HK: '🇭🇰 香港',
        US: '🇺🇸 美国',
        SG: '🇸🇬 新加坡',
        JP: '🇯🇵 日本',
        KR: '🇰🇷 韩国',
        DE: '🇩🇪 德国',
        SE: '🇸🇪 瑞典',
        NL: '🇳🇱 荷兰',
        FI: '🇫🇮 芬兰',
        GB: '🇬🇧 英国'
      },
      terminal: '终端 v3.0',
      autoDetectClient: '自动识别',
      customIPDisabledHint: 解码64('5L2/55So6Ieq5a6a5LmJUHJveHlJUOaXtu+8jOWcsOWMuumAieaLqeW3suemgeeUqA=='),
      kvNotConfigured: 'KV存储未配置，无法使用配置管理功能。\\n\\n请在Cloudflare Workers中:\\n1. 创建KV命名空间\\n2. 绑定环境变量 C\\n3. 重新部署代码',
      kvNotEnabled: 'KV存储未配置',
      kvCheckFailed: 'KV存储检测失败: 响应格式错误',
      kvCheckFailedStatus: 'KV存储检测失败 - 状态码: ',
      kvCheckFailedError: 'KV存储检测失败 - 错误: '
    },
    fa: {
      title: 'مرکز اشتراک',
      subtitle: 'پشتیبانی چند کلاینت • انتخاب هوشمند • تولید یک کلیکی',
      selectClient: '[ انتخاب کلاینت ]',
      configManagement: '[ مدیریت تنظیمات ]',
      kvStatusChecking: 'در حال بررسی وضعیت KV...',
      kvEnabled: '✅ ذخیره‌سازی KV فعال است، می‌توانید از مدیریت تنظیمات استفاده کنید',
      kvDisabled: '⚠️ ذخیره‌سازی KV فعال نیست یا پیکربندی نشده است',
      specifyRegion: 'تعیین منطقه (wk):',
      autoDetect: 'اتصال مستقیم رسمی',
      saveRegion: 'ذخیره تنظیمات منطقه',
      protocolSelection: 'انتخاب پروتکل:',
      enableProtoV: 解码64('2YHYudin2YTigIzYs9in2LLbjCDZvtix2YjYqtqp2YQgVkxFU1M='),
      enableECH: 'فعال‌سازی ECH (Encrypted Client Hello)',
      enableECHHint: 'پس از فعال‌سازی، در هر بار تازه‌سازی اشتراک، پیکربندی ECH به‌روز به‌طور خودکار از DoH دریافت شده و به لینک‌ها اضافه می‌شود',
      customDNS: 'سرور DNS سفارشی',
      customDNSPlaceholder: 'مثال: https://223.5.5.5/dns-query',
      customDNSHint: 'آدرس سرور DNS برای جستجوی پیکربندی ECH (فرمت DoH)',
      customECHDomain: 'دامنه ECH سفارشی',
      customECHDomainPlaceholder: 'مثال: cloudflare-ech.com',
      customECHDomainHint: 'دامنه استفاده شده در پیکربندی ECH، خالی بگذارید تا از مقدار پیش‌فرض استفاده شود',
      customPath: 'مسیر سفارشی (d):',
      customIP: 解码64('UHJveHlJUCDYs9mB2KfYsdi024wgKHApOg=='),
      preferredIPs: 'لیست IP ترجیحی (yx):',
      preferredIPsURL: 'URL منبع IP ترجیحی (yxURL):',
      socks5Config: 解码64('2KrZhti424zZhdin2Kog2b7YsdmI2qnYs9uMIChzKTo='),
      saveConfig: 'ذخیره تنظیمات',
      advancedControl: 'کنترل پیشرفته',
      builtinPreferred: 'نوع ترجیحی داخلی:',
      enablePreferredDomain: 'فعال‌سازی دامنه ترجیحی',
      enablePreferredIP: 'فعال‌سازی IP ترجیحی',
      enableNativeAddress: 'فعال‌سازی آدرس اصلی',
      enableGitHubPreferred: 'فعال‌سازی ترجیح سفارشی',
      allowAPIManagement: 'اجازه مدیریت API (ae):',
      regionMatching: 'تطبیق منطقه (rm):',
      downgradeControl: 解码64('2LHZiNi0INiu2LHZiNisIChxaik6'),
      tlsControl: 'کنترل TLS (dkby):',
      preferredControl: 'کنترل ترجیحی (yxby):',
      saveAdvanced: 'ذخیره تنظیمات پیشرفته',
      loading: 'در حال بارگذاری...',
      currentConfig: '📍 پیکربندی مسیر فعلی',
      refreshConfig: 'تازه‌سازی تنظیمات',
      resetConfig: 'بازنشانی تنظیمات',
      subscriptionCopied: 'لینک اشتراک کپی شد',
      autoSubscriptionCopied: 'لینک اشتراک تشخیص خودکار کپی شد، کلاینت هنگام دسترسی بر اساس User-Agent به طور خودکار تشخیص داده و قالب مربوطه را برمی‌گرداند',
      protocolHint: '• VLESS WS: پروتکل استاندارد مبتنی بر WebSocket',
      alpn: 'TLS ALPN',
      alpnDefault: 'پیش‌فرض (خالی، مذاکره توسط کلاینت)',
      alpnHint: 'فقط به لینک‌های TLS اضافه می‌شود؛ اگر خالی باشد alpn نوشته نمی‌شود.',
      saveProtocol: 'ذخیره تنظیمات پروتکل',
      builtinPreferredHint: 'کنترل اینکه کدام گره‌های ترجیحی داخلی در اشتراک گنجانده شوند. به طور پیش‌فرض همه فعال هستند.',
      apiEnabledDefault: 'پیش‌فرض (بستن API)',
      apiEnabledYes: 'فعال‌سازی مدیریت API',
      apiEnabledHint: '⚠️ هشدار امنیتی: فعال‌سازی این گزینه اجازه می‌دهد IP های ترجیحی از طریق API به طور پویا اضافه شوند. توصیه می‌شود فقط در صورت نیاز فعال کنید.',
      regionMatchingDefault: 'پیش‌فرض (فعال‌سازی تطبیق منطقه)',
      regionMatchingNo: 'بستن تطبیق منطقه',
      regionMatchingHint: 'وقتی "بستن" تنظیم شود، تطبیق هوشمند منطقه انجام نمی‌شود',
      downgradeControlDefault: 解码64('2KfZiNmE2YjbjNiqINio2Kcg2b7YsdmI2qnYs9uMICjZvtuM2LTigIzZgdix2LYp'),
      downgradeControlNo: 解码64('2KfZiNmE2YjbjNiqINio2Kcg2KfYqti12KfZhCDZhdiz2KrZgtuM2YXYjCDYr9ixINi12YjYsdiqINiu2LfYpyDZvtix2Yjaqdiz24w='),
      downgradeControlOnly: 解码64('2YHZgti3INm+2LHZiNqp2LPbjNiMINio2K/ZiNmGINio2KfYstqv2LTYqg=='),
      downgradeControlHint: 解码64('2Kfar9ixINm+2LHZiNqp2LPbjCDYqtmG2LjbjNmFINmG2LTYr9mHINio2KfYtNivINmH2LEg2LPZhyDar9iy24zZhtmHINuM2qnYs9in2YYg2Ygg2YXYs9iq2YLbjNmFINmH2LPYqtmG2K8uINiv2LEg2K3Yp9mE2Kog2YHZgti3INm+2LHZiNqp2LPbjNiMINin2KrYtdin2YQg2YbYp9mF2YjZgdmCINmC2LfYuSDZhduM4oCM2LTZiNivINmIIElQINiu2LHZiNis24wg2YHYp9i0INmG2YXbjOKAjNi02YjYrw=='),
      tlsControlDefault: 'پیش‌فرض (حفظ همه گره‌ها)',
      tlsControlYes: 'فقط گره‌های TLS',
      tlsControlHint: 'وقتی "فقط گره‌های TLS" تنظیم شود، فقط گره‌های با TLS تولید می‌شوند، گره‌های غیر TLS (مانند پورت 80) تولید نمی‌شوند',
      preferredControlDefault: 'پیش‌فرض (فعال‌سازی ترجیح)',
      preferredControlYes: 'بستن ترجیح',
      preferredControlHint: 'وقتی "بستن ترجیح" تنظیم شود، فقط از آدرس اصلی استفاده می‌شود، گره‌های IP و دامنه ترجیحی تولید نمی‌شوند',
      regionNames: {
        CF: '🌐 مستقیم رسمی',
        HK: '🇭🇰 هنگ کنگ',
        US: '🇺🇸 آمریکا',
        SG: '🇸🇬 سنگاپور',
        JP: '🇯🇵 ژاپن',
        KR: '🇰🇷 کره جنوبی',
        DE: '🇩🇪 آلمان',
        SE: '🇸🇪 سوئد',
        NL: '🇳🇱 هلند',
        FI: '🇫🇮 فنلاند',
        GB: '🇬🇧 بریتانیا'
      },
      terminal: 'ترمینال v3.0',
      autoDetectClient: 'تشخیص خودکار',
      customIPDisabledHint: 解码64('2YfZhtqv2KfZhSDYp9iz2KrZgdin2K/ZhyDYp9iyIFByb3h5SVAg2LPZgdin2LHYtNuM2Iwg2KfZhtiq2K7Yp9ioINmF2YbYt9mC2Ycg2LrbjNix2YHYudin2YQg2KfYs9iq'),
      kvNotConfigured: 'ذخیره‌سازی KV پیکربندی نشده است، نمی‌توانید از عملکرد مدیریت تنظیمات استفاده کنید.\\n\\nلطفا در Cloudflare Workers:\\n1. فضای نام KV ایجاد کنید\\n2. متغیر محیطی C را پیوند دهید\\n3. کد را دوباره مستقر کنید',
      kvNotEnabled: 'ذخیره‌سازی KV پیکربندی نشده است',
      kvCheckFailed: 'بررسی ذخیره‌سازی KV ناموفق: خطای فرمت پاسخ',
      kvCheckFailedStatus: 'بررسی ذخیره‌سازی KV ناموفق - کد وضعیت: ',
      kvCheckFailedError: 'بررسی ذخیره‌سازی KV ناموفق - خطا: '
    }
  };
  const 翻译值 = 本地值235[是否值236 ? 'fa' : 'zh'];
  const 值页面 = `<!DOCTYPE html>
    <html lang="${语言值}" dir="${是否值236 ? 'rtl' : 'ltr'}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${翻译值.title}</title>
        <style>
            :root {
                --bg: #090d16;
                --card-bg: #0f172a;
                --card-border: rgba(255, 255, 255, 0.08);
                --input-bg: #090d16;
                --input-border: #334155;
                --primary: #6366f1;
                --primary-hover: #4f46e5;
                --primary-glow: rgba(99, 102, 241, 0.25);
                --text-main: #f8fafc;
                --text-sub: #94a3b8;
                --text-muted: #64748b;
                --success: #10b981;
                --warning: #f59e0b;
                --danger: #ef4444;
                --info: #3b82f6;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { min-height: 100%; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background-color: var(--bg);
                background-image: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
                                  radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.06) 0px, transparent 50%);
                color: var(--text-main);
                min-height: 100vh;
                line-height: 1.5;
                -webkit-font-smoothing: antialiased;
            }
            .matrix-bg, .matrix-code-rain, .cp-hud, #cpFxToggle { display: none !important; }
            .cp-lang-wrapper {
                position: absolute;
                top: 24px;
                right: 24px;
                z-index: 100;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cp-lang-tag {
                color: var(--text-muted);
                font-size: 12px;
                font-weight: 500;
            }
            #languageSelector {
                background: #1e293b;
                border: 1px solid var(--card-border);
                color: var(--text-main);
                padding: 7px 14px;
                border-radius: 8px;
                font-size: 13px;
                cursor: pointer;
                outline: none;
                transition: border-color 0.2s;
            }
            #languageSelector:hover { border-color: var(--primary); }
            .container {
                max-width: 960px;
                margin: 40px auto 100px;
                padding: 0 20px;
                position: relative;
            }
            .header {
                text-align: center;
                margin-bottom: 32px;
                padding-top: 10px;
            }
            .title {
                font-size: 32px;
                font-weight: 800;
                letter-spacing: -0.025em;
                color: #ffffff;
                margin-bottom: 8px;
                background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .subtitle {
                color: var(--text-sub);
                font-size: 14px;
                font-weight: 400;
            }
            .card {
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
            }
            .card-title {
                font-size: 17px;
                font-weight: 600;
                color: #f1f5f9;
                margin-bottom: 18px;
                display: flex;
                align-items: center;
                gap: 10px;
                border-bottom: 1px solid var(--card-border);
                padding-bottom: 12px;
            }
            .client-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 10px;
                margin-bottom: 16px;
            }
            .client-btn {
                background: #1e293b;
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 10px;
                color: #e2e8f0;
                padding: 12px 14px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .client-btn:hover {
                background: var(--primary);
                border-color: var(--primary);
                color: #ffffff;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px var(--primary-glow);
            }
            .subscription-url {
                background: var(--input-bg);
                border: 1px solid var(--input-border);
                border-radius: 10px;
                padding: 14px 16px;
                font-family: "JetBrains Mono", Consolas, monospace;
                font-size: 13px;
                color: #a5b4fc;
                word-break: break-all;
                display: none;
            }
            .subscription-url.active { display: block; }
            #kvStatus {
                background: #1e293b !important;
                border: 1px solid var(--card-border) !important;
                border-radius: 10px !important;
                color: var(--text-sub) !important;
                padding: 12px 16px !important;
                font-size: 13px !important;
            }
            #configContent input[type="text"],
            #configContent input[type="number"],
            #configContent select,
            #configContent textarea {
                width: 100% !important;
                background: var(--input-bg) !important;
                border: 1px solid var(--input-border) !important;
                border-radius: 8px !important;
                color: var(--text-main) !important;
                padding: 10px 14px !important;
                font-family: inherit !important;
                font-size: 13px !important;
                box-sizing: border-box !important;
                outline: none !important;
                transition: border-color 0.2s, box-shadow 0.2s !important;
            }
            #configContent input[type="text"]:focus,
            #configContent input[type="number"]:focus,
            #configContent select:focus,
            #configContent textarea:focus {
                border-color: var(--primary) !important;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
            }
            #configContent label {
                color: var(--text-main) !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                text-shadow: none !important;
                display: block !important;
                margin-bottom: 6px !important;
            }
            #configContent small {
                color: var(--text-muted) !important;
                font-size: 12px !important;
                line-height: 1.4 !important;
            }
            #configContent div[style*="background: rgba(15, 3, 40"] {
                background: #1e293b !important;
                border: 1px solid var(--card-border) !important;
                border-radius: 10px !important;
                box-shadow: none !important;
            }
            .btn-primary, button[onclick*="保存"], button[onclick*="测试"] {
                background: var(--primary) !important;
                border: 1px solid var(--primary) !important;
                border-radius: 8px !important;
                color: #fff !important;
                padding: 10px 18px !important;
                font-weight: 600 !important;
                font-size: 13px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                box-shadow: 0 2px 8px var(--primary-glow) !important;
            }
            .btn-primary:hover, button[onclick*="保存"]:hover, button[onclick*="测试"]:hover {
                background: var(--primary-hover) !important;
                transform: translateY(-1px) !important;
            }
            /* Modern Floating Action Bar */
            .cp-action-bar {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(15, 23, 42, 0.88);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 14px;
                padding: 6px 8px;
                backdrop-filter: blur(16px);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3);
            }
            .cp-fab-save {
                display: flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, #0ea5e9, #0284c7);
                color: #ffffff;
                border: 1px solid rgba(56, 189, 248, 0.4);
                border-radius: 9px;
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 600;
                font-family: inherit;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);
            }
            .cp-fab-save:hover {
                background: linear-gradient(135deg, #38bdf8, #0ea5e9);
                box-shadow: 0 4px 14px rgba(56, 189, 248, 0.45);
                transform: translateY(-1px);
            }
            .cp-fab-save:active {
                transform: translateY(0);
            }
            .cp-fab-icon {
                font-size: 14px;
            }
            .cp-action-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                height: 35px;
                padding: 0 12px;
                border-radius: 9px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(30, 41, 59, 0.7);
                color: #cbd5e1;
                font-size: 12px;
                font-family: inherit;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            .cp-action-btn:hover {
                background: rgba(51, 65, 85, 0.9);
                color: #ffffff;
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }
            .cp-action-btn:active {
                transform: translateY(0);
            }
            .cp-action-btn-danger {
                color: #f87171;
                border-color: rgba(239, 68, 68, 0.25);
                background: rgba(239, 68, 68, 0.08);
            }
            .cp-action-btn-danger:hover {
                background: rgba(239, 68, 68, 0.2);
                color: #fca5a5;
                border-color: rgba(239, 68, 68, 0.4);
            }
            .cp-btn-label {
                font-size: 12px;
                font-weight: 500;
                line-height: 1;
            }
            .cp-action-btn-saving {
                opacity: 0.7;
                pointer-events: none;
            }
            .cp-action-status {
                color: var(--success);
                font-size: 13px;
                font-weight: 500;
                padding: 0 8px;
            }
            /* Toast Notifications */
            .cp-toast-stack {
                position: fixed;
                bottom: 80px;
                right: 28px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .cp-toast {
                background: #1e293b;
                border: 1px solid var(--card-border);
                border-radius: 10px;
                padding: 12px 18px;
                color: var(--text-main);
                font-size: 13px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: toast-in 0.25s ease-out;
            }
            @keyframes toast-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .cp-toast-success { border-left: 4px solid var(--success); }
            .cp-toast-error { border-left: 4px solid var(--danger); }
            .cp-toast-info { border-left: 4px solid var(--info); }
            @media (max-width: 640px) {
                .container { margin-top: 20px; padding: 0 14px; }
                .title { font-size: 24px; }
                .client-grid { grid-template-columns: repeat(2, 1fr); }
                .cp-action-bar { bottom: 16px; right: 16px; }
            }
        </style>
    </head>
    <body>
        <div class="matrix-code-rain" id="matrixCodeRain" style="display:none;"></div>
        <button type="button" id="cpFxToggle" style="display:none;"><span id="cpFxLabel"></span></button>
        <div class="cp-lang-wrapper">
            <span class="cp-lang-tag">LANG:</span>
            <select id="languageSelector" onchange="切换语言(this.value)">
                <option value="zh" ${!是否值236 ? 'selected' : ''}>🇨🇳 中文</option>
                <option value="fa" ${是否值236 ? 'selected' : ''}>🇮🇷 فارسی</option>
            </select>
        </div>
        <div class="container">
            <div class="header">
                <h1 class="title">${翻译值.title}</h1>
                <p class="subtitle">${翻译值.subtitle}</p>
            </div>
            <div class="card">
                    <h2 class="card-title">${翻译值.selectClient}</h2>
                <div class="client-grid">
                    <button class="client-btn" onclick="生成客户端链接(atob('Y2xhc2g='), 'CLASH')">CLASH</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('Y2xhc2g='), 'STASH')">STASH</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('c3VyZ2U='), 'SURGE')">SURGE</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('c2luZ2JveA=='), 'SING-BOX')">SING-BOX</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('bG9vbg=='), 'LOON')">LOON</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('cXVhbng='), 'QUANTUMULT X')">QUANTUMULT X</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('djJyYXk='), 'V2RAY')">V2RAY</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('djJyYXk='), 'V2RAYNG')">V2RAYNG</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('djJyYXk='), 'NEKORAY')">NEKORAY</button>
                    <button class="client-btn" onclick="生成客户端链接(atob('djJyYXk='), 'Shadowrocket')">Shadowrocket</button>
                </div>
                <div class="subscription-url" id="clientSubscriptionUrl"></div>
            </div>
            <div class="card" id="configCard" style="display: none;">
                    <h2 class="card-title">${翻译值.configManagement}</h2>
                <div id="kvStatus" style="margin-bottom: 20px; padding: 10px; background: rgba(8, 4, 28, 0.8); border: 1px solid #00f0ff; color: #00f0ff;">
                    ${翻译值.kvStatusChecking}
                </div>
                <div id="configContent" style="display: none;">
                    <form id="regionForm" style="margin-bottom: 20px;">
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.specifyRegion}</label>
                            <select id="wkRegion" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                    <option value="">${翻译值.autoDetect}</option>
                                    <option value="HK">${翻译值.regionNames.HK}</option>
                                    <option value="US">${翻译值.regionNames.US}</option>
                                    <option value="SG">${翻译值.regionNames.SG}</option>
                                    <option value="JP">${翻译值.regionNames.JP}</option>
                                    <option value="KR">${翻译值.regionNames.KR}</option>
                                    <option value="DE">${翻译值.regionNames.DE}</option>
                                    <option value="SE">${翻译值.regionNames.SE}</option>
                                    <option value="NL">${翻译值.regionNames.NL}</option>
                                    <option value="FI">${翻译值.regionNames.FI}</option>
                                    <option value="GB">${翻译值.regionNames.GB}</option>
                            </select>
                                <small id="wkRegionHint" style="color: #7aa9c4; font-size: 0.85rem; display: none;">⚠️ ${翻译值.customIPDisabledHint}</small>
                        </div>
                    </form>
                    <form id="otherConfigForm" style="margin-bottom: 20px;">
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.protocolSelection}</label>
                            <div style="padding: 15px; background: rgba(15, 3, 40, 0.6); border: 1px solid #00f0ff; border-radius: 5px;">
                                <div style="margin-bottom: 10px;">
                                    <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                        <input type="checkbox" id="ev" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1.1rem;">${翻译值.enableProtoV}</span>
                                    </label>
                                </div>
                                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0, 240, 255, 0.3);">
                                    <div style="margin-bottom: 10px;">
                                        <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                            <input type="checkbox" id="ech" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                                <span style="font-size: 1.1rem;">${翻译值.enableECH}</span>
                                        </label>
                                        <small style="color: #7aa9c4; font-size: 0.8rem; display: block; margin-top: 5px; margin-left: 26px;">${翻译值.enableECHHint}</small>
                                    </div>
                                    <div style="margin-top: 15px; margin-bottom: 10px;">
                                        <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-size: 0.95rem;">${翻译值.customDNS}</label>
                                        <input type="text" id="customDNS" placeholder="${翻译值.customDNSPlaceholder}" style="width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.8); border: 1px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 13px;">
                                        <small style="color: #7aa9c4; font-size: 0.8rem; display: block; margin-top: 5px;">${翻译值.customDNSHint}</small>
                                    </div>
                                    <div style="margin-bottom: 10px;">
                                        <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-size: 0.95rem;">${翻译值.customECHDomain}</label>
                                        <input type="text" id="customECHDomain" placeholder="${翻译值.customECHDomainPlaceholder}" style="width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.8); border: 1px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 13px;">
                                        <small style="color: #7aa9c4; font-size: 0.8rem; display: block; margin-top: 5px;">${翻译值.customECHDomainHint}</small>
                                    </div>
                                    <div style="margin-bottom: 10px;">
                                        <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-size: 0.95rem;">${翻译值.alpn}</label>
                                        <select id="alpn" style="width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.8); border: 1px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 13px;">
                                            <option value="">${翻译值.alpnDefault}</option>
                                            <option value="h3">h3</option>
                                            <option value="h2">h2</option>
                                            <option value="http/1.1">http/1.1</option>
                                            <option value="h3,h2">h3,h2</option>
                                            <option value="h2,http/1.1">h2,http/1.1</option>
                                            <option value="h3,h2,http/1.1">h3,h2,http/1.1</option>
                                        </select>
                                        <small style="color: #7aa9c4; font-size: 0.8rem; display: block; margin-top: 5px;">${翻译值.alpnHint}</small>
                                    </div>
                                </div>
                                    <small style="color: #7aa9c4; font-size: 0.85rem; display: block; margin-top: 10px;">${翻译值.protocolHint}</small>
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.customPath}</label>
                                <input type="text" id="customPath" placeholder="${是否值236 ? 'مثال: /mypath یا خالی بگذارید تا از UUID استفاده شود' : '例如: /mypath 或留空使用 UUID'}" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${是否值236 ? 解码64('2YXYs9uM2LEg2KfYtNiq2LHYp9qpINiz2YHYp9ix2LTbjC4g2Kfar9ixINiu2KfZhNuMINio2q/YsNin2LHbjNivINin2LIgVVVJRCDYqNmHINi52YbZiNin2YYg2YXYs9uM2LEg2KfYs9iq2YHYp9iv2Ycg2YXbjOKAjNi02YjYry4=') : 解码64('6Ieq5a6a5LmJ6K6i6ZiF6Lev5b6E44CC55WZ56m65YiZ5L2/55SoIFVVSUQg5L2c5Li66Lev5b6E44CC')}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.customIP}</label>
                                <input type="text" id="customIP" placeholder="${是否值236 ? 'مثال: 1.2.3.4:443' : '例如: 1.2.3.4:443'}" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${是否值236 ? 解码64('2KLYr9ix2LMg2Ygg2b7ZiNix2KogUHJveHlJUCDYs9mB2KfYsdi024w=') : 解码64('6Ieq5a6a5LmJUHJveHlJUOWcsOWdgOWSjOerr+WPow==')}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.preferredIPs}</label>
                                <input type="text" id="yx" placeholder="${是否值236 ? 'مثال: 1.2.3.4:443#گره هنگ‌کنگ,5.6.7.8:80#گره آمریکا,example.com:8443#گره سنگاپور' : '例如: 1.2.3.4:443#日本节点,5.6.7.8:80#美国节点,example.com:8443#新加坡节点'}" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${是否值236 ? 'فرمت: IP:پورت#نام گره یا IP:پورت (بدون # از نام پیش‌فرض استفاده می‌شود). پشتیبانی از چندین مورد، با کاما جدا می‌شوند. <span style="color: #ffb400;">IP های اضافه شده از طریق API به طور خودکار در اینجا نمایش داده می‌شوند.</span>' : '格式: IP:端口#节点名称 或 IP:端口 (无#则使用默认名称)。支持多个，用逗号分隔。<span style="color: #ffb400;">API添加的IP会自动显示在这里。</span>'}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.preferredIPsURL}</label>
                                <input type="text" id="yxURL" placeholder="${是否值236 ? 'URL منبع لیست IP ترجیحی را وارد کنید' : '输入优选IP列表来源URL'}" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${是否值236 ? 'URL منبع لیست IP ترجیحی سفارشی، اگر خالی بگذارید از آدرس پیش‌فرض استفاده می‌شود' : '自定义优选IP列表来源URL，留空则使用默认地址'}</small>
                        </div>
                        
                        <input type="hidden" id="socksConfig">
                        </form>

                    <h3 style="color: #00f0ff; margin: 20px 0 15px 0; font-size: 1.2rem;">${翻译值.advancedControl}</h3>
                    <form id="advancedConfigForm" style="margin-bottom: 20px;">
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.builtinPreferred}</label>
                            <div style="padding: 15px; background: rgba(15, 3, 40, 0.6); border: 1px solid #00f0ff; border-radius: 5px;">
                                <div style="margin-bottom: 10px;">
                                    <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                        <input type="checkbox" id="ena" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1.1rem;">${翻译值.enableNativeAddress}</span>
                                    </label>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                        <input type="checkbox" id="epd" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1.1rem;">${翻译值.enablePreferredDomain}</span>
                                    </label>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                        <input type="checkbox" id="epi" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1.1rem;">${翻译值.enablePreferredIP}</span>
                                    </label>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                        <input type="checkbox" id="egi" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1.1rem;">${翻译值.enableGitHubPreferred}</span>
                                    </label>
                                </div>
                                    <small style="color: #7aa9c4; font-size: 0.85rem; display: block; margin-top: 10px;">${翻译值.builtinPreferredHint}</small>
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">优选IP筛选设置</label>
                            <div style="padding: 15px; background: rgba(15, 3, 40, 0.6); border: 1px solid #00f0ff; border-radius: 5px;">
                                <div style="margin-bottom: 15px;">
                                    <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">IP版本选择</label>
                                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                                        <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                            <input type="checkbox" id="ipv4Enabled" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1rem;">IPv4</span>
                                        </label>
                                        <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                            <input type="checkbox" id="ipv6Enabled" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1rem;">IPv6</span>
                                        </label>
                                    </div>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">运营商选择</label>
                                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                                        <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                            <input type="checkbox" id="ispMobile" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1rem;">移动</span>
                                        </label>
                                        <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                            <input type="checkbox" id="ispUnicom" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1rem;">联通</span>
                                        </label>
                                        <label style="display: inline-flex; align-items: center; cursor: pointer; color: #00f0ff;">
                                            <input type="checkbox" id="ispTelecom" checked style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                                            <span style="font-size: 1rem;">电信</span>
                                        </label>
                                    </div>
                                </div>
                                    <small style="color: #7aa9c4; font-size: 0.85rem; display: block; margin-top: 10px;">选择要使用的IP版本和运营商，未选中的将被过滤</small>
                            </div>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.allowAPIManagement}</label>
                            <select id="apiEnabled" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                    <option value="">${翻译值.apiEnabledDefault}</option>
                                    <option value="yes">${翻译值.apiEnabledYes}</option>
                            </select>
                                <small style="color: #ffb400; font-size: 0.85rem;">${翻译值.apiEnabledHint}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.regionMatching}</label>
                            <select id="regionMatching" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                    <option value="">${翻译值.regionMatchingDefault}</option>
                                    <option value="no">${翻译值.regionMatchingNo}</option>
                            </select>
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${翻译值.regionMatchingHint}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.downgradeControl}</label>
                            <select id="downgradeControl" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                    <option value="">${翻译值.downgradeControlDefault}</option>
                                    <option value="no">${翻译值.downgradeControlNo}</option>
                                    <option value="only">${翻译值.downgradeControlOnly}</option>
                            </select>
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${翻译值.downgradeControlHint}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.tlsControl}</label>
                            <select id="portControl" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                    <option value="">${翻译值.tlsControlDefault}</option>
                                    <option value="yes">${翻译值.tlsControlYes}</option>
                            </select>
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${翻译值.tlsControlHint}</small>
                        </div>
                        <div style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 8px; color: #00f0ff; font-weight: bold; text-shadow: 0 0 3px #00f0ff;">${翻译值.preferredControl}</label>
                            <select id="preferredControl" style="width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00f0ff; color: #00f0ff; font-family: 'Courier New', monospace; font-size: 14px;">
                                    <option value="">${翻译值.preferredControlDefault}</option>
                                    <option value="yes">${翻译值.preferredControlYes}</option>
                            </select>
                                <small style="color: #7aa9c4; font-size: 0.85rem;">${翻译值.preferredControlHint}</small>
                        </div>
                    </form>
                    <div id="currentConfig" style="background: rgba(0, 0, 0, 0.9); border: 1px solid #00f0ff; padding: 15px; margin: 10px 0; font-family: 'Courier New', monospace; color: #00f0ff;">
                            ${翻译值.loading}
                    </div>
                    <div id="pathTypeInfo" style="background: rgba(15, 3, 40, 0.7); border: 1px solid #00f0ff; padding: 15px; margin: 10px 0; font-family: 'Courier New', monospace; color: #00f0ff;">
                            <div style="font-weight: bold; margin-bottom: 8px; color: #00ff9d; text-shadow: 0 0 5px #00ff9d;">${翻译值.currentConfig}</div>
                            <div id="pathTypeStatus">${翻译值.checking}</div>
                    </div>
                </div>
                <div id="statusMessage" style="display: none; padding: 10px; margin: 10px 0; border: 1px solid #00f0ff; background: rgba(8, 4, 28, 0.8); color: #00f0ff; text-shadow: 0 0 5px #00f0ff;"></div>
            </div>
        </div>
        <div id="cpToastStack" class="cp-toast-stack" aria-live="polite" aria-atomic="false"></div>
        <div id="cpActionStatus" class="cp-action-status" role="status" aria-live="polite"></div>
        <div id="cpActionBar" class="cp-action-bar" role="toolbar" aria-label="${翻译值.configManagement}">
            <button type="button" id="cpBtnSaveAll" class="cp-fab-save" title="${是否值236 ? 'ذخیره همه تنظیمات' : '保存所有配置 (Ctrl+S)'}">
                <span class="cp-fab-icon">💾</span>
                <span>${是否值236 ? 'ذخیره همه' : '保存全部'}</span>
            </button>
            <button type="button" id="cpBtnRefresh" class="cp-action-btn" data-tip="${翻译值.refreshConfig}" aria-label="${翻译值.refreshConfig}">
                <span aria-hidden="true">↻</span>
                <span class="cp-btn-label">${翻译值.refreshConfig}</span>
            </button>
            <button type="button" id="cpBtnReset" class="cp-action-btn cp-action-btn-danger" data-tip="${翻译值.resetConfig}" aria-label="${翻译值.resetConfig}">
                <span aria-hidden="true">↺</span>
                <span class="cp-btn-label">${翻译值.resetConfig}</span>
            </button>
        </div>
        <script>
// 翻译对象
const 本地值20215 = {
  zh: {
    subscriptionCopied: '${解码64('6K6i6ZiF6ZO+5o6l5bey5aSN5Yi2')}',
    autoSubscriptionCopied: '${解码64('6Ieq5Yqo6K+G5Yir6K6i6ZiF6ZO+5o6l5bey5aSN5Yi277yM5a6i5oi356uv6K6/6Zeu5pe25Lya5qC55o2uVXNlci1BZ2VudOiHquWKqOivhuWIq+W5tui/lOWbnuWvueW6lOagvOW8jw==')}'
  },
  fa: {
    subscriptionCopied: 'لینک اشتراک کپی شد',
    autoSubscriptionCopied: 'لینک اشتراک تشخیص خودکار کپی شد، کلاینت هنگام دسترسی بر اساس User-Agent به طور خودکار تشخیص داده و قالب مربوطه را برمی‌گرداند'
  }
};
function 获取凭据20214(名称20213) {
  const 值20212 = '; ' + document.cookie;
  const 部分列表20211 = 值20212.split('; ' + 名称20213 + '=');
  if (部分列表20211.length === 2) return 部分列表20211.pop().split(';').shift();
  return null;
}
const 浏览器语言20210 = navigator.language || navigator.userLanguage || '';
const 已保存语言20209 = localStorage.getItem('preferredLanguage') || 获取凭据20214('preferredLanguage');
let 是否值20208 = false;
if (已保存语言20209 === 'fa' || 已保存语言20209 === 'fa-IR') {
  是否值20208 = true;
} else if (已保存语言20209 === 'zh' || 已保存语言20209 === 'zh-CN') {
  是否值20208 = false;
} else {
  是否值20208 = 浏览器语言20210.includes('fa') || 浏览器语言20210.includes('fa-IR');
}
const 翻译值20207 = 本地值20215[是否值20208 ? 'fa' : 'zh'];
function 切换语言(语言) {
  localStorage.setItem('preferredLanguage', 语言);
  // 设置Cookie（有效期1年）
  const 过期日期20206 = new Date();
  过期日期20206.setFullYear(过期日期20206.getFullYear() + 1);
  document.cookie = 'preferredLanguage=' + 语言 + '; path=/; expires=' + 过期日期20206.toUTCString() + '; SameSite=Lax';
  // 刷新页面，不使用URL参数
  window.location.reload();
}

// 页面加载时检查 localStorage 和 Cookie，并清理URL参数
window.addEventListener('DOMContentLoaded', function () {
  const 已保存语言20205 = localStorage.getItem('preferredLanguage') || 获取凭据20214('preferredLanguage');
  const 网址参数 = new URLSearchParams(window.location.search);
  const 网址语言 = 网址参数.get('lang');

  // 如果URL中有语言参数，移除它并设置Cookie
  if (网址语言) {
    const 当前网址20204 = new URL(window.location.href);
    当前网址20204.searchParams.delete('lang');
    const 新网址 = 当前网址20204.toString();

    // 设置Cookie
    const 过期日期20203 = new Date();
    过期日期20203.setFullYear(过期日期20203.getFullYear() + 1);
    document.cookie = 'preferredLanguage=' + 网址语言 + '; path=/; expires=' + 过期日期20203.toUTCString() + '; SameSite=Lax';
    localStorage.setItem('preferredLanguage', 网址语言);

    // 使用history API移除URL参数，不刷新页面
    window.history.replaceState({}, '', 新网址);
  } else if (已保存语言20205) {
    // 如果localStorage中有但Cookie中没有，同步到Cookie
    const 过期日期 = new Date();
    过期日期.setFullYear(过期日期.getFullYear() + 1);
    document.cookie = 'preferredLanguage=' + 已保存语言20205 + '; path=/; expires=' + 过期日期.toUTCString() + '; SameSite=Lax';
  }
});

// 赛博朋克风 toast 通知 (替代 alert)
window.显示提示 = function (消息20202, 类型20201, 本地值20200) {
  本地值20200 = 本地值20200 || {};
  var 堆栈 = document.getElementById('cpToastStack');
  if (!堆栈) return;
  var 类型映射 = {
    success: '✓',
    info: '⌬',
    warn: '⚠',
    error: '✕'
  };
  var 标题映射 = {
    success: 'SUCCESS',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR'
  };
  类型20201 = 类型映射[类型20201] ? 类型20201 : 'success';
  var 持续时间 = 本地值20200.duration || 3200;
  var 提示 = document.createElement('div');
  提示.className = 'cp-toast cp-toast-' + 类型20201;
  提示.style.setProperty('--cp-toast-dur', 持续时间 + 'ms');
  var 图标 = document.createElement('span');
  图标.className = 'cp-toast-icon';
  图标.textContent = 类型映射[类型20201];
  var 主体 = document.createElement('div');
  主体.className = 'cp-toast-body';
  var 标题 = document.createElement('div');
  标题.className = 'cp-toast-title';
  标题.textContent = 本地值20200.title || 标题映射[类型20201];
  var 消息20199 = document.createElement('div');
  消息20199.className = 'cp-toast-msg';
  消息20199.textContent = String(消息20202 == null ? '' : 消息20202);
  主体.appendChild(标题);
  主体.appendChild(消息20199);
  var 关闭 = document.createElement('button');
  关闭.type = 'button';
  关闭.className = 'cp-toast-close';
  关闭.setAttribute('aria-label', 'close');
  关闭.textContent = '✕';
  提示.appendChild(图标);
  提示.appendChild(主体);
  提示.appendChild(关闭);
  堆栈.appendChild(提示);
  requestAnimationFrame(function () {
    提示.classList.add('cp-show');
  });
  var 本地值20198 = false;
  function 关闭提示() {
    if (本地值20198) return;
    本地值20198 = true;
    提示.classList.remove('cp-show');
    提示.classList.add('cp-hide');
    setTimeout(function () {
      if (提示.parentNode) 提示.parentNode.removeChild(提示);
    }, 400);
  }
  关闭.addEventListener('click', 关闭提示);
  var 计时器 = setTimeout(关闭提示, 持续时间);
  提示.addEventListener('mouseenter', function () {
    clearTimeout(计时器);
  });
  提示.addEventListener('mouseleave', function () {
    计时器 = setTimeout(关闭提示, 1200);
  });
  return {
    dismiss: 关闭提示,
    element: 提示
  };
};
function 尝试打开应用(方案网址20197, 回退回调, 超时20196) {
  超时20196 = 超时20196 || 2500;
  var 应用已打开 = false;
  var 回调已执行 = false;
  var 开始值 = Date.now();
  var 值值20195 = function () {
    var 耗时20194 = Date.now() - 开始值;
    if (耗时20194 < 3000 && !回调已执行) {
      应用已打开 = true;
    }
  };
  window.addEventListener('blur', 值值20195);
  var 值值20193 = function () {
    var 耗时 = Date.now() - 开始值;
    if (耗时 < 3000 && !回调已执行) {
      应用已打开 = true;
    }
  };
  document.addEventListener('visibilitychange', 值值20193);
  var 内嵌框架 = document.createElement('iframe');
  内嵌框架.style.display = 'none';
  内嵌框架.style.width = '1px';
  内嵌框架.style.height = '1px';
  内嵌框架.src = 方案网址20197;
  document.body.appendChild(内嵌框架);
  setTimeout(function () {
    内嵌框架.parentNode && 内嵌框架.parentNode.removeChild(内嵌框架);
    window.removeEventListener('blur', 值值20195);
    document.removeEventListener('visibilitychange', 值值20193);
    if (!回调已执行) {
      回调已执行 = true;
      if (!应用已打开 && 回退回调) {
        回退回调();
      }
    }
  }, 超时20196);
}
function 生成客户端链接(客户端类型, 客户端名称) {
  var 当前网址20192 = window.location.href;
  var 订阅网址20191 = 当前网址20192 + "/sub";
  var 方案网址 = '';
  var 显示名称 = 客户端名称 || '';
  var 最终网址 = 订阅网址20191;
  if (客户端类型 === atob('djJyYXk=')) {
    最终网址 = 订阅网址20191;
    var 网址值20190 = document.getElementById("clientSubscriptionUrl");
    网址值20190.textContent = 最终网址;
    网址值20190.style.display = "block";
    网址值20190.style.overflowWrap = "break-word";
    网址值20190.style.wordBreak = "break-all";
    网址值20190.style.overflowX = "auto";
    网址值20190.style.maxWidth = "100%";
    网址值20190.style.boxSizing = "border-box";
    if (客户端名称 === 'V2RAY') {
      navigator.clipboard.writeText(最终网址).then(function () {
        显示提示(显示名称 + " " + 翻译值20207.subscriptionCopied, 'success');
      });
    } else if (客户端名称 === 'Shadowrocket') {
      方案网址 = '${解码64('c2hhZG93cm9ja2V0Oi8vYWRkLw==')}' + encodeURIComponent(最终网址);
      尝试打开应用(方案网址, function () {
        navigator.clipboard.writeText(最终网址).then(function () {
          显示提示(显示名称 + " " + 翻译值20207.subscriptionCopied, 'success');
        });
      });
    } else if (客户端名称 === 'V2RAYNG') {
      方案网址 = '${解码64('djJyYXluZzovL2luc3RhbGw/dXJsPQ==')}' + encodeURIComponent(最终网址);
      尝试打开应用(方案网址, function () {
        navigator.clipboard.writeText(最终网址).then(function () {
          显示提示(显示名称 + " " + 翻译值20207.subscriptionCopied, 'success');
        });
      });
    } else if (客户端名称 === 'NEKORAY') {
      方案网址 = '${解码64('bmVrb3JheTovL2luc3RhbGwtY29uZmlnP3VybD0=')}' + encodeURIComponent(最终网址);
      尝试打开应用(方案网址, function () {
        navigator.clipboard.writeText(最终网址).then(function () {
          显示提示(显示名称 + " " + 翻译值20207.subscriptionCopied, 'success');
        });
      });
    }
  } else {
    // 统一走内部格式转换
    最终网址 = 订阅网址20191 + (订阅网址20191.includes('?') ? '&' : '?') + "target=" + 客户端类型;
    var 网址值20190 = document.getElementById("clientSubscriptionUrl");
    网址值20190.textContent = 最终网址;
    网址值20190.style.display = "block";
    网址值20190.style.overflowWrap = "break-word";
    网址值20190.style.wordBreak = "break-all";
    网址值20190.style.overflowX = "auto";
    网址值20190.style.maxWidth = "100%";
    网址值20190.style.boxSizing = "border-box";
    if (客户端类型 === atob('Y2xhc2g=')) {
      if (客户端名称 === 'STASH') {
        方案网址 = '${解码64('c3Rhc2g6Ly9pbnN0YWxsP3VybD0=')}' + encodeURIComponent(最终网址);
        显示名称 = 'STASH';
      } else {
        方案网址 = '${解码64('Y2xhc2g6Ly9pbnN0YWxsLWNvbmZpZz91cmw9')}' + encodeURIComponent(最终网址);
        显示名称 = 'CLASH';
      }
    } else if (客户端类型 === atob('c3VyZ2U=')) {
      方案网址 = '${解码64('c3VyZ2U6Ly8vaW5zdGFsbC1jb25maWc/dXJsPQ==')}' + encodeURIComponent(最终网址);
      显示名称 = 'SURGE';
    } else if (客户端类型 === atob('c2luZ2JveA==')) {
      方案网址 = '${解码64('c2luZy1ib3g6Ly9pbnN0YWxsLWNvbmZpZz91cmw9')}' + encodeURIComponent(最终网址);
      显示名称 = 'SING-BOX';
    } else if (客户端类型 === atob('bG9vbg==')) {
      方案网址 = '${解码64('bG9vbjovL2luc3RhbGw/dXJsPQ==')}' + encodeURIComponent(最终网址);
      显示名称 = 'LOON';
    } else if (客户端类型 === atob('cXVhbng=')) {
      方案网址 = '${解码64('cXVhbnR1bXVsdC14Oi8vaW5zdGFsbC1jb25maWc/dXJsPQ==')}' + encodeURIComponent(最终网址);
      显示名称 = 'QUANTUMULT X';
    }
    if (方案网址) {
      尝试打开应用(方案网址, function () {
        navigator.clipboard.writeText(最终网址).then(function () {
          显示提示(显示名称 + " " + 翻译值20207.subscriptionCopied, 'success');
        });
      });
    } else {
      navigator.clipboard.writeText(最终网址).then(function () {
        显示提示(显示名称 + " " + 翻译值20207.subscriptionCopied, 'success');
      });
    }
  }
}

// 页面特效图形化开关 (localStorage 持久化)
window.应用页面特效 = function () {
  var 本地值20189 = localStorage.getItem('cp-fx-off') === '1';
  document.body.classList.toggle('fx-off', 本地值20189);
  var 本地值20188 = document.getElementById('cpFxLabel');
  if (本地值20188) 本地值20188.textContent = 本地值20189 ? 'FX: OFF' : 'FX: ON';
  if (本地值20189) {
    var 本地值20187 = document.getElementById('matrixCodeRain');
    if (本地值20187) 本地值20187.innerHTML = '';
  } else if (typeof 创建矩阵雨 === 'function') {
    var 结果值 = document.getElementById('matrixCodeRain');
    if (结果值 && !结果值.firstChild) 创建矩阵雨();
  }
};
window.切换页面特效 = function () {
  var 本地值20186 = localStorage.getItem('cp-fx-off') === '1';
  localStorage.setItem('cp-fx-off', 本地值20186 ? '0' : '1');
  window.应用页面特效();
};
(function () {
  if (localStorage.getItem('cp-fx-off') === '1') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.classList.add('fx-off');
      var 本地值20185 = document.getElementById('cpFxLabel');
      if (本地值20185) 本地值20185.textContent = 'FX: OFF';
    });
  }
})();
function 创建矩阵雨() {
  if (document.body && document.body.classList.contains('fx-off')) return;
  const 矩阵值 = document.getElementById('matrixCodeRain');
  if (!矩阵值) return;
  const 赛博字符列表 = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ$%#@!?<>+=ABCDEF';
  const 调色板 = ['#00f0ff', '#ff2bd6', '#a347ff', '#00ff9d'];
  const 列数 = Math.floor(window.innerWidth / 20);
  for (let 索引值20184 = 0; 索引值20184 < 列数; 索引值20184++) {
    const 列20183 = document.createElement('div');
    列20183.className = 'matrix-column';
    列20183.style.left = 索引值20184 * 20 + 'px';
    列20183.style.animationDelay = -Math.random() * 15 + 's';
    列20183.style.animationDuration = Math.random() * 14 + 8 + 's';
    列20183.style.fontSize = Math.random() * 4 + 12 + 'px';
    列20183.style.opacity = (Math.random() * 0.7 + 0.3).toFixed(2);
    let 文本20182 = '';
    const 字符数量 = Math.floor(Math.random() * 30 + 18);
    for (let 次索引值 = 0; 次索引值 < 字符数量; 次索引值++) {
      const 字符 = 赛博字符列表[Math.floor(Math.random() * 赛博字符列表.length)];
      const 值强调 = Math.random() > 0.85;
      const 颜色 = 值强调 ? 调色板[Math.floor(Math.random() * 调色板.length)] : '';
      文本20182 += 颜色 ? '<span style="color:' + 颜色 + ';text-shadow:0 0 8px ' + 颜色 + ';">' + 字符 + '</span><br>' : '<span>' + 字符 + '</span><br>';
    }
    列20183.innerHTML = 文本20182;
    矩阵值.appendChild(列20183);
  }
  setInterval(function () {
    const 列列表 = 矩阵值.querySelectorAll('.matrix-column');
    列列表.forEach(function (列) {
      if (Math.random() > 0.94) {
        const 字符列表 = 列.querySelectorAll('span');
        if (字符列表.length > 0) {
          const 目标20181 = 字符列表[Math.floor(Math.random() * 字符列表.length)];
          const 本地值20180 = 目标20181.style.color;
          目标20181.style.color = '#ffffff';
          目标20181.style.textShadow = '0 0 10px #ffffff, 0 0 18px #00f0ff';
          setTimeout(function () {
            目标20181.style.color = 本地值20180;
            目标20181.style.textShadow = '';
          }, 200);
        }
      }
    });
  }, 110);
}

// 配置管理相关函数
async function 检查键值状态() {
  const 接口网址20134 = window.location.pathname + '/api/config';
  try {
    const 响应20133 = await fetch(接口网址20134);
    function 获取凭据20132(名称20131) {
      const 值20130 = '; ' + document.cookie;
      const 部分列表20129 = 值20130.split('; ' + 名称20131 + '=');
      if (部分列表20129.length === 2) return 部分列表20129.pop().split(';').shift();
      return null;
    }
    const 浏览器语言20128 = navigator.language || navigator.userLanguage || '';
    const 已保存语言20127 = localStorage.getItem('preferredLanguage') || 获取凭据20132('preferredLanguage');
    let 是否值20126 = false;
    if (已保存语言20127 === 'fa' || 已保存语言20127 === 'fa-IR') {
      是否值20126 = true;
    } else {
      是否值20126 = 浏览器语言20128.includes('fa') || 浏览器语言20128.includes('fa-IR');
    }
    const 本地值20125 = {
      zh: {
        kvDisabled: '⚠️ KV存储未启用或未配置',
        kvNotConfigured: 'KV存储未配置，无法使用配置管理功能。\\n\\n请在Cloudflare Workers中:\\n1. 创建KV命名空间\\n2. 绑定环境变量 C\\n3. 重新部署代码',
        kvNotEnabled: 'KV存储未配置',
        kvEnabled: '✅ KV存储已启用，可以使用配置管理功能',
        kvCheckFailed: '⚠️ KV存储检测失败',
        kvCheckFailedFormat: 'KV存储检测失败: 响应格式错误',
        kvCheckFailedStatus: 'KV存储检测失败 - 状态码: ',
        kvCheckFailedError: 'KV存储检测失败 - 错误: '
      },
      fa: {
        kvDisabled: '⚠️ ذخیره‌سازی KV فعال نیست یا پیکربندی نشده است',
        kvNotConfigured: 'ذخیره‌سازی KV پیکربندی نشده است، نمی‌توانید از عملکرد مدیریت تنظیمات استفاده کنید.\\n\\nلطفا در Cloudflare Workers:\\n1. فضای نام KV ایجاد کنید\\n2. متغیر محیطی C را پیوند دهید\\n3. کد را دوباره مستقر کنید',
        kvNotEnabled: 'ذخیره‌سازی KV پیکربندی نشده است',
        kvEnabled: '✅ ذخیره‌سازی KV فعال است، می‌توانید از مدیریت تنظیمات استفاده کنید',
        kvCheckFailed: '⚠️ بررسی ذخیره‌سازی KV ناموفق',
        kvCheckFailedFormat: 'بررسی ذخیره‌سازی KV ناموفق: خطای فرمت پاسخ',
        kvCheckFailedStatus: 'بررسی ذخیره‌سازی KV ناموفق - کد وضعیت: ',
        kvCheckFailedError: 'بررسی ذخیره‌سازی KV ناموفق - خطا: '
      }
    };
    const 翻译值20124 = 本地值20125[是否值20126 ? 'fa' : 'zh'];
    if (响应20133.status === 503) {
      // KV未配置
      document.getElementById('kvStatus').innerHTML = '<span style="color: #ffb400;">' + 翻译值20124.kvDisabled + '</span>';
      document.getElementById('configCard').style.display = 'block';
      document.getElementById('currentConfig').textContent = 翻译值20124.kvNotConfigured;
    } else if (响应20133.ok) {
      try {
        const 数据20123 = await 响应20133.json();

        // 检查响应是否包含KV配置信息
        if (数据20123 && 数据20123.kvEnabled === true) {
          document.getElementById('kvStatus').innerHTML = '<span style="color: #00ff9d;">' + 翻译值20124.kvEnabled + '</span>';
          document.getElementById('configContent').style.display = 'block';
          document.getElementById('configCard').style.display = 'block';
          await 加载当前配置();
        } else {
          document.getElementById('kvStatus').innerHTML = '<span style="color: #ffb400;">' + 翻译值20124.kvDisabled + '</span>';
          document.getElementById('configCard').style.display = 'block';
          document.getElementById('currentConfig').textContent = 翻译值20124.kvNotEnabled;
        }
      } catch (数据对象错误) {
        document.getElementById('kvStatus').innerHTML = '<span style="color: #ffb400;">' + 翻译值20124.kvCheckFailed + '</span>';
        document.getElementById('configCard').style.display = 'block';
        document.getElementById('currentConfig').textContent = 翻译值20124.kvCheckFailedFormat;
      }
    } else {
      document.getElementById('kvStatus').innerHTML = '<span style="color: #ffb400;">' + 翻译值20124.kvDisabled + '</span>';
      document.getElementById('configCard').style.display = 'block';
      document.getElementById('currentConfig').textContent = 翻译值20124.kvCheckFailedStatus + 响应20133.status;
    }
  } catch (错误20122) {
    function 获取凭据(名称) {
      const 值20121 = '; ' + document.cookie;
      const 部分列表20120 = 值20121.split('; ' + 名称 + '=');
      if (部分列表20120.length === 2) return 部分列表20120.pop().split(';').shift();
      return null;
    }
    const 浏览器语言 = navigator.language || navigator.userLanguage || '';
    const 已保存语言 = localStorage.getItem('preferredLanguage') || 获取凭据('preferredLanguage');
    let 是否值 = false;
    if (已保存语言 === 'fa' || 已保存语言 === 'fa-IR') {
      是否值 = true;
    } else {
      是否值 = 浏览器语言.includes('fa') || 浏览器语言.includes('fa-IR');
    }
    const 本地值20119 = {
      zh: {
        kvDisabled: '⚠️ KV存储未启用或未配置',
        kvCheckFailedError: 'KV存储检测失败 - 错误: '
      },
      fa: {
        kvDisabled: '⚠️ ذخیره‌سازی KV فعال نیست یا پیکربندی نشده است',
        kvCheckFailedError: 'بررسی ذخیره‌سازی KV ناموفق - خطا: '
      }
    };
    const 翻译值20118 = 本地值20119[是否值 ? 'fa' : 'zh'];
    document.getElementById('kvStatus').innerHTML = '<span style="color: #ffb400;">' + 翻译值20118.kvDisabled + '</span>';
    document.getElementById('configCard').style.display = 'block';
    document.getElementById('currentConfig').textContent = 翻译值20118.kvCheckFailedError + 错误20122.message;
  }
}
function 读取字段值(标识) {
  const 元素 = document.getElementById(标识);
  return 元素 ? 元素.value : '';
}

function 写入字段值(标识, 值 = '') {
  const 元素 = document.getElementById(标识);
  if (元素) 元素.value = 值 || '';
}

function 是否开关启用(值, 默认启用 = false) {
  if (值 === undefined || 值 === null || 值 === '') return 默认启用;
  if (值 === true || 值 === false) return 值;
  const 文本 = String(值).trim().toLowerCase();
  if (文本 === 'yes' || 文本 === 'true' || 文本 === '1' || 文本 === 'on') return true;
  if (文本 === 'no' || 文本 === 'false' || 文本 === '0' || 文本 === 'off') return false;
  return 默认启用;
}

function 写入开关值(标识, 值, 默认启用 = false) {
  const 元素 = document.getElementById(标识);
  if (元素) 元素.checked = 是否开关启用(值, 默认启用);
}

function 读取开关值(标识, 默认启用 = false) {
  const 元素 = document.getElementById(标识);
  if (!元素) return 默认启用 ? 'yes' : 'no';
  return 元素.checked ? 'yes' : 'no';
}

function 同步协议界面状态() {
  const 明文开关 = document.getElementById('ev');
  if (明文开关 && !明文开关.checked) {
    明文开关.checked = true;
  }
}

function 同步联动界面状态() {
  同步协议界面状态();
  const 加密客户端问候复选框 = document.getElementById('ech');
  const 端口控制 = document.getElementById('portControl');
  if (加密客户端问候复选框 && 端口控制 && 加密客户端问候复选框.checked) {
    端口控制.value = 'yes';
  }
  更新路径类型状态(读取字段值('customPath'));
  更新工作器地区状态();
}

function 应用配置到界面(配置) {
  写入字段值('wkRegion', 配置.wk);
  写入开关值('ev', 配置.ev, true);
  写入开关值('ech', 配置.ech, false);
  写入字段值('customDNS', 配置.customDNS);
  写入字段值('customECHDomain', 配置.customECHDomain);
  写入字段值('alpn', 配置.alpn);
  写入开关值('ena', 配置.ena, false);
  写入开关值('epd', 配置.epd, true);
  写入开关值('epi', 配置.epi, true);
  写入开关值('egi', 配置.egi, true);
  写入开关值('ipv4Enabled', 配置.ipv4, true);
  写入开关值('ipv6Enabled', 配置.ipv6, true);
  写入开关值('ispMobile', 配置.ispMobile, true);
  写入开关值('ispUnicom', 配置.ispUnicom, true);
  写入开关值('ispTelecom', 配置.ispTelecom, true);
  写入字段值('customPath', 配置.d);
  写入字段值('customIP', 配置.p);
  写入字段值('yx', 配置.yx);
  写入字段值('yxURL', 配置.yxURL);
  写入字段值('socksConfig', 配置.s);
  写入字段值('apiEnabled', 配置.ae);
  写入字段值('regionMatching', 配置.rm);
  写入字段值('downgradeControl', 配置.qj);
  写入字段值('portControl', 配置.dkby);
  写入字段值('preferredControl', 配置.yxby);
  同步联动界面状态();
}

function 收集界面配置() {
  const 配置 = {
    wk: 读取字段值('wkRegion'),
    ev: 读取开关值('ev', true),
    ech: 读取开关值('ech', false),
    customDNS: 读取字段值('customDNS'),
    customECHDomain: 读取字段值('customECHDomain'),
    alpn: 读取字段值('alpn'),
    d: 读取字段值('customPath'),
    p: 读取字段值('customIP'),
    yx: 读取字段值('yx'),
    yxURL: 读取字段值('yxURL'),
    s: 读取字段值('socksConfig'),
    ena: 读取开关值('ena', false),
    epd: 读取开关值('epd', true),
    epi: 读取开关值('epi', true),
    egi: 读取开关值('egi', true),
    ae: 读取字段值('apiEnabled'),
    rm: 读取字段值('regionMatching'),
    qj: 读取字段值('downgradeControl'),
    dkby: 读取字段值('portControl'),
    yxby: 读取字段值('preferredControl'),
    ipv4: 读取开关值('ipv4Enabled', true),
    ipv6: 读取开关值('ipv6Enabled', true),
    ispMobile: 读取开关值('ispMobile', true),
    ispUnicom: 读取开关值('ispUnicom', true),
    ispTelecom: 读取开关值('ispTelecom', true)
  };
  if (配置.ev === 'no') {
    配置.ev = 'yes';
    写入开关值('ev', 'yes', true);
  }
  if (配置.ech === 'yes') {
    配置.dkby = 'yes';
    写入字段值('portControl', 'yes');
  }
  return 配置;
}

async function 加载当前配置() {
  const 接口网址20117 = window.location.pathname + '/api/config';
  try {
    const 响应20116 = await fetch(接口网址20117);
    if (响应20116.status === 503) {
      document.getElementById('currentConfig').textContent = 'KV存储未配置，无法加载配置';
      return;
    }
    if (!响应20116.ok) {
      const 错误文本20115 = await 响应20116.text();
      document.getElementById('currentConfig').textContent = '加载配置失败: ' + 错误文本20115;
      return;
    }
    const 配置 = await 响应20116.json();

    // 过滤掉内部字段 kvEnabled
    const 显示配置 = {};
    for (const [键20114, 值20113] of Object.entries(配置)) {
      if (键20114 !== 'kvEnabled') {
        显示配置[键20114] = 值20113;
      }
    }
    let 配置文本 = '当前配置:\\n';
    if (Object.keys(显示配置).length === 0) {
      配置文本 += '(暂无配置)';
    } else {
      for (const [键, 值20112] of Object.entries(显示配置)) {
        配置文本 += 键 + ': ' + (值20112 || '(未设置)') + '\\n';
      }
    }
    document.getElementById('currentConfig').textContent = 配置文本;

    应用配置到界面(配置);
  } catch (错误20111) {
    document.getElementById('currentConfig').textContent = '加载配置失败: ' + 错误20111.message;
  }
}

// 更新路径类型显示
function 更新路径类型状态(自定义路径) {
  const 路径类型状态 = document.getElementById('pathTypeStatus');
  const 当前网址20110 = window.location.href;
  const 路径部分列表 = window.location.pathname.split('/').filter(参数值20109 => 参数值20109);
  const 当前路径 = 路径部分列表.length > 0 ? 路径部分列表[0] : '';
  if (自定义路径 && 自定义路径.trim()) {
    // 使用自定义路径 (d)
    路径类型状态.innerHTML = '<div style="color: #00ff9d;">使用类型: <strong>自定义路径 (d)</strong></div>' + '<div style="margin-top: 5px; color: #00f0ff;">当前路径: <span style="color: #ffb400;">' + 自定义路径 + '</span></div>' + '<div style="margin-top: 5px; font-size: 0.9rem; color: #7aa9c4;">访问地址: ' + (当前网址20110.split('/')[0] + '//' + 当前网址20110.split('/')[2]) + 自定义路径 + '/sub</div>';
  } else {
    // 使用 UUID (u)
    路径类型状态.innerHTML = '<div style="color: #00ff9d;">使用类型: <strong>UUID 路径 (u)</strong></div>' + '<div style="margin-top: 5px; color: #00f0ff;">当前路径: <span style="color: #ffb400;">' + (当前路径 || '(UUID)') + '</span></div>' + '<div style="margin-top: 5px; font-size: 0.9rem; color: #7aa9c4;">访问地址: ' + 当前网址20110.split('/sub')[0] + '/sub</div>';
  }
}

// 更新wk地区选择的启用/禁用状态
function 更新工作器地区状态() {
  const 自定义地址输入20108 = document.getElementById('customIP');
  const 值地区 = document.getElementById('wkRegion');
  const 值地区值 = document.getElementById('wkRegionHint');
  if (自定义地址输入20108 && 值地区) {
    const 是否有自定义地址 = 自定义地址输入20108.value.trim() !== '';
    值地区.disabled = 是否有自定义地址;

    // 添加视觉反馈
    if (是否有自定义地址) {
      值地区.style.opacity = '0.5';
      值地区.style.cursor = 'not-allowed';
      值地区.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      // 显示提示信息
      if (值地区值) {
        值地区值.style.display = 'block';
        值地区值.style.color = '#ffb400';
      }
    } else {
      值地区.style.opacity = '1';
      值地区.style.cursor = 'pointer';
      值地区.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      // 隐藏提示信息
      if (值地区值) {
        值地区值.style.display = 'none';
      }
    }
  }
}
async function 保存配置(配置数据20107) {
  const 接口网址 = window.location.pathname + '/api/config';
  try {
    const 响应20106 = await fetch(接口网址, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(配置数据20107)
    });
    if (响应20106.status === 503) {
      显示状态('KV存储未配置，无法保存配置。请先在Cloudflare Workers中配置KV存储。', 'error');
      return;
    }
    if (!响应20106.ok) {
      const 错误文本20105 = await 响应20106.text();

      // 尝试解析 JSON 错误信息
      try {
        const 错误数据20104 = JSON.parse(错误文本20105);
        显示状态(错误数据20104.message || '保存失败', 'error');
      } catch (解析错误20103) {
        // 如果不是 JSON，直接显示文本
        显示状态('保存失败: ' + 错误文本20105, 'error');
      }
      return;
    }
    const 结果20102 = await 响应20106.json();
    显示状态(结果20102.message, 结果20102.success ? 'success' : 'error');
    if (结果20102.success) {
      await 加载当前配置();
      // 更新wk地区选择状态
      更新工作器地区状态();
      // 保存成功后刷新页面以更新系统状态
      setTimeout(function () {
        window.location.reload();
      }, 1500);
    } else {}
  } catch (错误20101) {
    显示状态('保存失败: ' + 错误20101.message, 'error');
  }
}
function 显示状态(消息20100, 类型20099) {
  const 状态值 = document.getElementById('statusMessage');
  if (状态值) {
    状态值.textContent = 消息20100;
    状态值.style.display = 'block';
    状态值.style.color = 类型20099 === 'success' ? '#00f0ff' : '#ff3860';
    状态值.style.borderColor = 类型20099 === 'success' ? '#00f0ff' : '#ff3860';
    setTimeout(function () {
      状态值.style.display = 'none';
    }, 3000);
  }
  // 同步在底部操作条上方弹出霓虹反馈
  if (typeof window.显示操作状态 === 'function') {
    window.显示操作状态(消息20100, 类型20099 === 'success' ? 'ok' : 'err');
  }
}
async function 重置全部配置() {
  if (confirm('确定要重置所有配置吗？这将清空所有KV配置，恢复为环境变量设置。')) {
    try {
      const 响应20098 = await fetch(window.location.pathname + '/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wk: '',
          d: '',
          p: '',
          yx: '',
          yxURL: '',
          s: '',
          ae: '',
          rm: '',
          qj: '',
          dkby: '',
          yxby: '',
          ev: '',
          ech: '',
          customDNS: '',
          customECHDomain: '',
          epd: '',
          epi: '',
          egi: '',
          ipv4: '',
          ipv6: '',
          ispMobile: '',
          ispUnicom: '',
          ispTelecom: '',
          alpn: ''
        })
      });
      if (响应20098.status === 503) {
        显示状态('KV存储未配置，无法重置配置。', 'error');
        return;
      }
      if (!响应20098.ok) {
        const 错误文本 = await 响应20098.text();

        // 尝试解析 JSON 错误信息
        try {
          const 错误数据 = JSON.parse(错误文本);
          显示状态(错误数据.message || '重置失败', 'error');
        } catch (解析错误) {
          // 如果不是 JSON，直接显示文本
          显示状态('重置失败: ' + 错误文本, 'error');
        }
        return;
      }
      const 结果20097 = await 响应20098.json();
      显示状态(结果20097.message || '配置已重置', 结果20097.success ? 'success' : 'error');
      if (结果20097.success) {
        await 加载当前配置();
        // 更新wk地区选择状态
        更新工作器地区状态();
        // 刷新页面以更新系统状态
        setTimeout(function () {
          window.location.reload();
        }, 1500);
      }
    } catch (错误20096) {
      显示状态('重置失败: ' + 错误20096.message, 'error');
    }
  }
}
document.addEventListener('DOMContentLoaded', function () {
  创建矩阵雨();
  检查键值状态();

  // ECH 开启时自动联动开启仅TLS
  const 加密客户端问候复选框 = document.getElementById('ech');
  const 端口控制 = document.getElementById('portControl');
  if (加密客户端问候复选框 && 端口控制) {
    加密客户端问候复选框.addEventListener('change', function () {
      if (this.checked) {
        // ECH 开启时，自动设置仅TLS为 yes
        端口控制.value = 'yes';
      }
      同步联动界面状态();
    });

    // 页面加载时，如果 ECH 已勾选，也自动设置仅TLS
    if (加密客户端问候复选框.checked) {
      端口控制.value = 'yes';
    }
  }

  // 监听customIP输入框变化，实时更新wk地区选择状态
  const 自定义地址输入 = document.getElementById('customIP');
  if (自定义地址输入) {
    自定义地址输入.addEventListener('input', function () {
      同步联动界面状态();
    });
  }


  const 自定义路径输入 = document.getElementById('customPath');
  if (自定义路径输入) {
    自定义路径输入.addEventListener('input', function () {
      同步联动界面状态();
    });
  }

  ['ev'].forEach(function (协议标识) {
    const 协议开关 = document.getElementById(协议标识);
    if (协议开关) {
      协议开关.addEventListener('change', function () {
        同步联动界面状态();
      });
    }
  });

  // 阻止表单默认提交（保存按钮已统一到底部操作条）
  ['regionForm', 'otherConfigForm', 'advancedConfigForm'].forEach(function (本地值20093) {
    const 表单值 = document.getElementById(本地值20093);
    if (表单值) 表单值.addEventListener('submit', function (事件值20092) {
      事件值20092.preventDefault();
    });
  });

  // 在任意输入框按下回车，触发统一保存
  document.querySelectorAll('#configContent input[type="text"], #configContent input[type="number"]').forEach(function (本地值20091) {
    本地值20091.addEventListener('keydown', function (事件值20090) {
      if (事件值20090.key === 'Enter') {
        事件值20090.preventDefault();
        保存全部配置();
      }
    });
  });

  // 统一保存：一次性收齐所有字段
  function 收集全部配置() {
    return 收集界面配置();
  }
  async function 保存全部配置() {
    // 至少启用一个通道
    const 值值20085 = document.getElementById('ev');
    if (值值20085 && !值值20085.checked) {
      显示操作状态('${是否值236 ? 解码64('2K3Yr9in2YLZhCDbjNqpINm+2LHZiNiq2qnZhCDYsdinINmB2LnYp9mEINqp2YbbjNivIQ==') : 解码64('6Iez5bCR6ZyA6KaB5ZCv55So5LiA5Liq5Y2P6K6u77yB')}', 'err');
      显示提示('${是否值236 ? 解码64('2K3Yr9in2YLZhCDbjNqpINm+2LHZiNiq2qnZhCDYsdinINmB2LnYp9mEINqp2YbbjNivIQ==') : 解码64('6Iez5bCR6ZyA6KaB5ZCv55So5LiA5Liq5Y2P6K6u77yB')}', 'warn');
      return;
    }
    const 本地值20082 = document.getElementById('cpBtnSaveAll');
    if (本地值20082) {
      本地值20082.classList.add('cp-action-btn-saving');
      本地值20082.disabled = true;
    }
    try {
      await 保存配置(收集全部配置());
    } finally {
      if (本地值20082) {
        本地值20082.classList.remove('cp-action-btn-saving');
        本地值20082.disabled = false;
      }
    }
  }
  window.保存全部配置 = 保存全部配置;
  function 显示操作状态(消息, 类型) {
    const 本地值20081 = document.getElementById('cpActionStatus');
    if (!本地值20081) return;
    本地值20081.textContent = 消息;
    本地值20081.classList.toggle('cp-err', 类型 === 'err');
    本地值20081.classList.add('cp-show');
    clearTimeout(显示操作状态._t);
    显示操作状态._t = setTimeout(function () {
      本地值20081.classList.remove('cp-show');
    }, 2400);
  }
  window.显示操作状态 = 显示操作状态;

  // 绑定底部统一操作条
  const 值操作值 = document.getElementById('cpActionBar');
  const 值值保存值 = document.getElementById('cpBtnSaveAll');
  if (值值保存值) 值值保存值.addEventListener('click', async function () {
    值值保存值.classList.add('cp-action-btn-saving');
    try {
      await 保存全部配置();
      if (值操作值) 值操作值.classList.remove('cp-dirty');
    } finally {
      值值保存值.classList.remove('cp-action-btn-saving');
    }
  });
  const 值值值20080 = document.getElementById('cpBtnRefresh');
  if (值值值20080) 值值值20080.addEventListener('click', async function () {
    值值值20080.classList.add('cp-action-btn-saving');
    try {
      await 加载当前配置();
      if (值操作值) 值操作值.classList.remove('cp-dirty');
      显示操作状态('${是否值236 ? 'تنظیمات تازه‌سازی شد' : '配置已刷新'}');
    } finally {
      值值值20080.classList.remove('cp-action-btn-saving');
    }
  });
  const 值值重置 = document.getElementById('cpBtnReset');
  if (值值重置) 值值重置.addEventListener('click', 重置全部配置);

  // 修改字段时把 FAB 标记为 "未保存"
  function 标记已修改() {
    if (值操作值) 值操作值.classList.add('cp-dirty');
  }
  const 已修改范围 = document.getElementById('configContent') || document;
  ['input', 'change'].forEach(function (本地值20079) {
    已修改范围.addEventListener(本地值20079, function (事件值20078) {
      const 本地值20077 = 事件值20078.target;
      if (!本地值20077 || !本地值20077.tagName) return;
      const 本地值20076 = 本地值20077.tagName.toLowerCase();
      if (本地值20076 === 'input' || 本地值20076 === 'select' || 本地值20076 === 'textarea') {
        // 跳过延迟测试相关输入，避免误触
        if (本地值20077.id && /^(latencyTestInput|fetchURLInput|latencyTestPort|randomIPCount|testThreads|ipSourceSelect)$/.test(本地值20077.id)) return;
        标记已修改();
      }
    });
  });

  // Ctrl+S / Cmd+S 触发保存
  window.addEventListener('keydown', function (事件值20075) {
    if ((事件值20075.ctrlKey || 事件值20075.metaKey) && (事件值20075.key === 's' || 事件值20075.key === 'S')) {
      事件值20075.preventDefault();
      if (值值保存值 && !值值保存值.classList.contains('cp-action-btn-saving')) {
        值值保存值.click();
      }
    }
  });
});
</script>
    </body>
    </html>`;
  return new Response(值页面, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
function 处理基础64值数组(值64字符串) {
  if (!值64字符串) return {
    error: null
  };
  try {
    值64字符串 = 值64字符串.replace(/-/g, '+').replace(/_/g, '/');
    return {
      earlyData: Uint8Array.from(atob(值64字符串), 丙值117 => 丙值117.charCodeAt(0)).buffer,
      error: null
    };
  } catch (错误116) {
    return {
      error: 错误116
    };
  }
}
function 关闭套接字值(套接字) {
  try {
    if (套接字.readyState === 1 || 套接字.readyState === 2) 套接字.close();
  } catch (错误115) {}
}
const 十六进制值 = Array.from({
  length: 256
}, (取值, 索引值) => (索引值 + 256).toString(16).slice(1));
function 处理格式值(本地值114, 偏移 = 0) {
  const 标识 = (十六进制值[本地值114[偏移]] + 十六进制值[本地值114[偏移 + 1]] + 十六进制值[本地值114[偏移 + 2]] + 十六进制值[本地值114[偏移 + 3]] + "-" + 十六进制值[本地值114[偏移 + 4]] + 十六进制值[本地值114[偏移 + 5]] + "-" + 十六进制值[本地值114[偏移 + 6]] + 十六进制值[本地值114[偏移 + 7]] + "-" + 十六进制值[本地值114[偏移 + 8]] + 十六进制值[本地值114[偏移 + 9]] + "-" + 十六进制值[本地值114[偏移 + 10]] + 十六进制值[本地值114[偏移 + 11]] + 十六进制值[本地值114[偏移 + 12]] + 十六进制值[本地值114[偏移 + 13]] + 十六进制值[本地值114[偏移 + 14]] + 十六进制值[本地值114[偏移 + 15]]).toLowerCase();
  if (!是否有效格式(标识)) throw new TypeError(错误_无效标识字符串);
  return 标识;
}
async function 获取值解析新地址列表() {
  const 网址113 = 优选地址源;
  try {
    const 网址列表112 = 网址113.includes(',') ? 网址113.split(',').map(网址值111 => 网址值111.trim()).filter(网址值 => 网址值) : [网址113];
    const 接口结果列表 = await 获取优选接口(网址列表112, '443', 5000);
    if (接口结果列表.length > 0) {
      const 结果列表110 = [];
      const 正则 = /^(\[[\da-fA-F:]+\]|[\d.]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d+))?(?:#(.+))?$/;
      for (const 项目109 of 接口结果列表) {
        const 本地值108 = 项目109.match(正则);
        if (本地值108) {
          结果列表110.push({
            ip: 规范化节点主机(本地值108[1]),
            port: parseInt(本地值108[2] || '443', 10),
            name: 本地值108[3]?.trim() || 本地值108[1]
          });
        }
      }
      return 结果列表110;
    }
    const 响应107 = await fetch(网址113);
    if (!响应107.ok) return [];
    const 文本106 = await 响应107.text();
    const 结果列表105 = [];
    const 行列表104 = 文本106.trim().replace(/\r/g, "").split('\n');
    const 值正则 = /^([^:]+):(\d+)#(.*)$/;
    for (const 行103 of 行列表104) {
      const 值行 = 行103.trim();
      if (!值行) continue;
      const 本地值102 = 值行.match(值正则);
      if (本地值102) {
        结果列表105.push({
          ip: 本地值102[1],
          port: parseInt(本地值102[2], 10),
          name: 本地值102[3].trim() || 本地值102[1]
        });
      }
    }
    return 结果列表105;
  } catch (错误101) {
    return [];
  }
}
function 生成链接列表来源新地址列表(列表100, 用户99, 工作器域名98, 加密客户端问候配置97 = null, 跳过编号96 = false, 别名命名器95 = null) {
  const 云墙超文本端口94 = [80, 8080, 8880, 2052, 2082, 2086, 2095];
  const 云墙安全超文本端口93 = [443, 2053, 2083, 2087, 2096, 8443];
  const 链接列表92 = [];
  const 网页套接字路径91 = '/?ed=2048';
  const 协议 = atob('dmxlc3M=');
  const 制作节点名称90 = 别名命名器95 || 创建值节点命名器(跳过编号96);
  for (const 项目89 of 列表100) {
    const 端口88 = 项目89.port;
    const 安全地址87 = 项目89.ip.includes(':') ? `[${项目89.ip}]` : 项目89.ip;
    if (云墙安全超文本端口93.includes(端口88)) {
      const 网页套接字节点名称86 = 制作节点名称90(项目89);
      let 链接85 = `${协议}://${用户99}@${安全地址87}:${端口88}?encryption=none&security=tls&sni=${工作器域名98}&fp=${启用加密客户端问候 ? 'chrome' : 'randomized'}&type=ws&host=${工作器域名98}&path=${网页套接字路径91}`;
      if (自定义应用层协议协商) 链接85 += `&alpn=${encodeURIComponent(自定义应用层协议协商)}`;

      // 如果启用了ECH，添加ech参数（ECH需要伪装成Chrome浏览器）
      if (启用加密客户端问候) {
        const 域名系统值84 = 自定义域名系统 || 'https://223.5.5.5/dns-query';
        const 加密客户端问候域名83 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
        链接85 += `&ech=${encodeURIComponent(`${加密客户端问候域名83}+${域名系统值84}`)}`;
      }
      链接85 += `#${encodeURIComponent(网页套接字节点名称86)}`;
      链接列表92.push(链接85);
    } else if (云墙超文本端口94.includes(端口88)) {
      if (!禁用非传输层安全) {
        const 网页套接字节点名称82 = 制作节点名称90(项目89);
        const 链接81 = `${协议}://${用户99}@${安全地址87}:${端口88}?encryption=none&security=none&type=ws&host=${工作器域名98}&path=${网页套接字路径91}#${encodeURIComponent(网页套接字节点名称82)}`;
        链接列表92.push(链接81);
      }
    } else {
      const 网页套接字节点名称80 = 制作节点名称90(项目89);
      let 链接79 = `${协议}://${用户99}@${安全地址87}:${端口88}?encryption=none&security=tls&sni=${工作器域名98}&fp=${启用加密客户端问候 ? 'chrome' : 'randomized'}&type=ws&host=${工作器域名98}&path=${网页套接字路径91}`;
      if (自定义应用层协议协商) 链接79 += `&alpn=${encodeURIComponent(自定义应用层协议协商)}`;

      // 如果启用了ECH，添加ech参数（ECH需要伪装成Chrome浏览器）
      if (启用加密客户端问候) {
        const 域名系统值78 = 自定义域名系统 || 'https://223.5.5.5/dns-query';
        const 加密客户端问候域名77 = 自定义加密客户端问候域名 || 'cloudflare-ech.com';
        链接79 += `&ech=${encodeURIComponent(`${加密客户端问候域名77}+${域名系统值78}`)}`;
      }
      链接79 += `#${encodeURIComponent(网页套接字节点名称80)}`;
      链接列表92.push(链接79);
    }
  }
  return 链接列表92;
}

async function 处理配置接口(请求54, 环境值 = {}) {
  if (请求54.method === 'GET') {
    if (!键值存储) {
      return new Response(JSON.stringify({
        error: 'KV存储未配置',
        kvEnabled: false
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      ...获取有效配置快照(环境值),
      kvEnabled: true
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } else if (请求54.method === 'POST') {
    if (!键值存储) {
      return new Response(JSON.stringify({
        success: false,
        message: 'KV存储未配置，无法保存配置'
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    try {
      const 新配置 = await 请求54.json();
      for (const [键, 值] of Object.entries(新配置)) {
        if (值 === '' || 值 === null || 值 === undefined) {
          delete 键值配置[键];
        } else {
          键值配置[键] = 值;
        }
      }
      await 保存键值配置();
      更新配置值();
      if (新配置.yx !== undefined) {
        更新自定义优选来源值();
      }
      return new Response(JSON.stringify({
        success: true,
        message: '配置已保存',
        config: 获取有效配置快照(环境值)
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (错误53) {
      return new Response(JSON.stringify({
        success: false,
        message: '保存配置失败: ' + 错误53.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
  return new Response(JSON.stringify({
    error: 'Method not allowed'
  }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
async function 处理优选地址列表接口(请求) {
  if (!键值存储) {
    return new Response(JSON.stringify({
      success: false,
      error: 'KV存储未配置',
      message: '需要配置KV存储才能使用此功能'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  const 本地值52 = 获取配置值('ae', '') === 'yes';
  if (!本地值52) {
    return new Response(JSON.stringify({
      success: false,
      error: 'API功能未启用',
      message: '出于安全考虑，优选IP API功能默认关闭。请在配置管理页面开启"允许API管理"选项后使用。'
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    if (请求.method === 'GET') {
      const 值值51 = 获取配置值('yx', '');
      const 本地值50 = 解析值值数组(值值51);
      return new Response(JSON.stringify({
        success: true,
        count: 本地值50.length,
        data: 本地值50
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else if (请求.method === 'POST') {
      const 主体49 = await 请求.json();
      const 地址列表值添加 = Array.isArray(主体49) ? 主体49 : [主体49];
      if (地址列表值添加.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: '请求数据为空',
          message: '请提供IP数据'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      const 值值48 = 获取配置值('yx', '');
      let 本地值47 = 解析值值数组(值值48);
      const 值地址列表46 = [];
      const 值地址列表45 = [];
      const 错误列表 = [];
      for (const 项目44 of 地址列表值添加) {
        if (!项目44.ip) {
          错误列表.push({
            ip: '未知',
            reason: 'IP地址是必需的'
          });
          continue;
        }
        const 端口43 = 项目44.port || 443;
        const 名称 = 项目44.name || `API优选-${项目44.ip}:${端口43}`;
        if (!是否有效地址(项目44.ip) && !是否有效域名(项目44.ip)) {
          错误列表.push({
            ip: 项目44.ip,
            reason: '无效的IP或域名格式'
          });
          continue;
        }
        const 本地值42 = 本地值47.some(值项目 => 值项目.ip === 项目44.ip && 值项目.port === 端口43);
        if (本地值42) {
          值地址列表45.push({
            ip: 项目44.ip,
            port: 端口43,
            reason: '已存在'
          });
          continue;
        }
        const 新地址 = {
          ip: 项目44.ip,
          port: 端口43,
          name: 名称,
          addedAt: new Date().toISOString()
        };
        本地值47.push(新地址);
        值地址列表46.push(新地址);
      }
      if (值地址列表46.length > 0) {
        const 新值值41 = 处理数组值值(本地值47);
        await 设置配置值('yx', 新值值41);
        更新自定义优选来源值();
      }
      return new Response(JSON.stringify({
        success: 值地址列表46.length > 0,
        message: `成功添加 ${值地址列表46.length} 个IP`,
        added: 值地址列表46.length,
        skipped: 值地址列表45.length,
        errors: 错误列表.length,
        data: {
          addedIPs: 值地址列表46,
          skippedIPs: 值地址列表45.length > 0 ? 值地址列表45 : undefined,
          errors: 错误列表.length > 0 ? 错误列表 : undefined
        }
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else if (请求.method === 'DELETE') {
      const 主体 = await 请求.json();
      if (主体.all === true) {
        const 值值40 = 获取配置值('yx', '');
        const 本地值39 = 解析值值数组(值值40);
        const 值数量 = 本地值39.length;
        await 设置配置值('yx', '');
        更新自定义优选来源值();
        return new Response(JSON.stringify({
          success: true,
          message: `已清空所有优选IP，共删除 ${值数量} 个`,
          deletedCount: 值数量
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      if (!主体.ip) {
        return new Response(JSON.stringify({
          success: false,
          error: 'IP地址是必需的',
          message: '请提供要删除的ip字段，或使用 {"all": true} 清空所有'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      const 端口38 = 主体.port || 443;
      const 值值37 = 获取配置值('yx', '');
      let 本地值36 = 解析值值数组(值值37);
      const 值长度 = 本地值36.length;
      const 值地址列表 = 本地值36.filter(项目35 => !(项目35.ip === 主体.ip && 项目35.port === 端口38));
      if (值地址列表.length === 值长度) {
        return new Response(JSON.stringify({
          success: false,
          error: '优选IP不存在',
          message: `${主体.ip}:${端口38} 未找到`
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      const 新值值 = 处理数组值值(值地址列表);
      await 设置配置值('yx', 新值值);
      更新自定义优选来源值();
      return new Response(JSON.stringify({
        success: true,
        message: '优选IP已删除',
        deleted: {
          ip: 主体.ip,
          port: 端口38
        }
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: '不支持的请求方法',
        message: '支持的方法: GET, POST, DELETE'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (错误34) {
    return new Response(JSON.stringify({
      success: false,
      error: '处理请求失败',
      message: 错误34.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
function 更新配置值() {
  const 有效配置 = 获取有效配置快照();
  const 手动地区 = 有效配置.wk;
  if (手动地区 && 手动地区.trim()) {
    手动工作器地区 = 手动地区.trim().toUpperCase();
    当前工作器地区 = 手动工作器地区;
  } else {
    const 本地值 = 有效配置.p;
    if (本地值 && 本地值.trim()) {
      当前工作器地区 = 'CUSTOM';
    } else {
      手动工作器地区 = '';
      当前工作器地区 = '';
    }
  }
  启用地区匹配 = !(有效配置.rm && 有效配置.rm.toLowerCase() === 'no');
  启用明文 = 有效配置.ev === 'yes';
  启用优选域名 = 有效配置.epd === 'yes';
  启用优选地址 = 有效配置.epi === 'yes';
  启用仓库优选 = 有效配置.egi === 'yes';
  启用原生地址 = 有效配置.ena === 'yes';
  启用加密客户端问候 = 有效配置.ech === 'yes';
  自定义域名系统 = 有效配置.customDNS || 配置默认值.customDNS;
  自定义加密客户端问候域名 = 有效配置.customECHDomain || 配置默认值.customECHDomain;
  自定义应用层协议协商 = 规范化应用层协议协商(有效配置.alpn || '');
  禁用非传输层安全 = 有效配置.dkby === 'yes' || 启用加密客户端问候;
  const 降级控制值 = (有效配置.qj || '').toLowerCase();
  启用代理降级 = 降级控制值 === 'no';
  仅走代理 = 降级控制值 === 'only';
  自定义路径 = 有效配置.d || '';
  优选地址源 = 有效配置.yxURL || '';
  回退地址 = 有效配置.p ? 有效配置.p.trim() : '';
  代理5配置 = 有效配置.s || '';
  if (代理5配置) {
    try {
      已解析代理5配置 = 解析代理配置(代理5配置);
      是否代理已启用 = true;
    } catch (错误31) {
      是否代理已启用 = false;
    }
  } else {
    已解析代理5配置 = {};
    是否代理已启用 = false;
  }
  禁用优选 = !!(有效配置.yxby && 有效配置.yxby.toLowerCase() === 'yes');
}
function 更新自定义优选来源值() {
  const 值值30 = 获取配置值('yx', '');
  if (值值30) {
    try {
      const 优选列表 = 值值30.split(',').map(项目29 => 项目29.trim()).filter(项目28 => 项目28);
      自定义优选地址列表 = [];
      自定义优选域名列表 = [];
      优选列表.forEach(项目27 => {
        let 节点名称26 = '';
        let 地址部分25 = 项目27;
        if (项目27.includes('#')) {
          const 部分列表24 = 项目27.split('#');
          地址部分25 = 部分列表24[0].trim();
          节点名称26 = 部分列表24[1].trim();
        }
        const {
          address: 地址23,
          port: 端口22
        } = 解析地址值端口(地址部分25);
        if (!节点名称26) {
          节点名称26 = '自定义优选-' + 地址23 + (端口22 ? ':' + 端口22 : '');
        }
        if (是否有效地址(地址23)) {
          自定义优选地址列表.push({
            ip: 地址23,
            port: 端口22,
            isp: 节点名称26
          });
        } else {
          自定义优选域名列表.push({
            domain: 地址23,
            port: 端口22,
            name: 节点名称26
          });
        }
      });
    } catch (错误) {
      自定义优选地址列表 = [];
      自定义优选域名列表 = [];
    }
  } else {
    自定义优选地址列表 = [];
    自定义优选域名列表 = [];
  }
}
function 解析值值数组(值值) {
  if (!值值 || !值值.trim()) return [];
  const 项目列表 = 值值.split(',').map(项目21 => 项目21.trim()).filter(项目20 => 项目20);
  const 结果 = [];
  for (const 项目19 of 项目列表) {
    let 节点名称 = '';
    let 地址部分 = 项目19;
    if (项目19.includes('#')) {
      const 部分列表 = 项目19.split('#');
      地址部分 = 部分列表[0].trim();
      节点名称 = 部分列表[1].trim();
    }
    const {
      address: 地址,
      port: 端口18
    } = 解析地址值端口(地址部分);
    if (!节点名称) {
      节点名称 = 地址 + (端口18 ? ':' + 端口18 : '');
    }
    结果.push({
      ip: 地址,
      port: 端口18 || 443,
      name: 节点名称,
      addedAt: new Date().toISOString()
    });
  }
  return 结果;
}
function 处理数组值值(数组) {
  if (!数组 || 数组.length === 0) return '';
  return 数组.map(项目 => {
    const 端口17 = 项目.port || 443;
    return `${项目.ip}:${端口17}#${项目.name}`;
  }).join(',');
}
function 是否有效域名(域名) {
  const 域名正则 = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return 域名正则.test(域名);
}
async function 解析文本值数组(内容) {
  var 已处理 = 内容.replace(/[	"'\r\n]+/g, ',').replace(/,+/g, ',');
  if (已处理.charAt(0) == ',') 已处理 = 已处理.slice(1);
  if (已处理.charAt(已处理.length - 1) == ',') 已处理 = 已处理.slice(0, 已处理.length - 1);
  return 已处理.split(',');
}
async function 获取优选接口(网址列表, 默认端口 = '443', 超时 = 3000) {
  if (!网址列表?.length) return [];
  const 结果列表 = new Set();
  await Promise.allSettled(网址列表.map(async 网址 => {
    try {
      const 控制器 = new AbortController();
      const 超时标识 = setTimeout(() => 控制器.abort(), 超时);
      const 响应 = await fetch(网址, {
        signal: 控制器.signal
      });
      clearTimeout(超时标识);
      let 文本 = '';
      try {
        const 缓冲 = await 响应.arrayBuffer();
        const 内容类型 = (响应.headers.get('content-type') || '').toLowerCase();
        const 字符集 = 内容类型.match(/charset=([^\s;]+)/i)?.[1]?.toLowerCase() || '';
        let 解码器列表 = ['utf-8', 'gb2312'];
        if (字符集.includes('gb') || 字符集.includes('gbk') || 字符集.includes('gb2312')) {
          解码器列表 = ['gb2312', 'utf-8'];
        }
        let 解码成功 = false;
        for (const 解码器 of 解码器列表) {
          try {
            const 已解码 = new TextDecoder(解码器).decode(缓冲);
            if (已解码 && 已解码.length > 0 && !已解码.includes('\ufffd')) {
              文本 = 已解码;
              解码成功 = true;
              break;
            } else if (已解码 && 已解码.length > 0) {
              continue;
            }
          } catch (事件值16) {
            continue;
          }
        }
        if (!解码成功) {
          文本 = await 响应.text();
        }
        if (!文本 || 文本.trim().length === 0) {
          return;
        }
      } catch (事件值15) {
        return;
      }
      const 行列表 = 文本.trim().split('\n').map(行值14 => 行值14.trim()).filter(行值 => 行值);
      const 是否值 = 行列表.length > 1 && 行列表[0].includes(',');
      const 六版地址模式 = /^[^\[\]]*:[^\[\]]*:[^\[\]]/;
      if (!是否值) {
        行列表.forEach(行13 => {
          const 井号索引 = 行13.indexOf('#');
          const [主机部分, 备注] = 井号索引 > -1 ? [行13.substring(0, 井号索引), 行13.substring(井号索引)] : [行13, ''];
          let 是否有端口 = false;
          if (主机部分.startsWith('[')) {
            是否有端口 = /\]:(\d+)$/.test(主机部分);
          } else {
            const 值索引 = 主机部分.lastIndexOf(':');
            是否有端口 = 值索引 > -1 && /^\d+$/.test(主机部分.substring(值索引 + 1));
          }
          const 端口12 = new URL(网址).searchParams.get('port') || 默认端口;
          结果列表.add(是否有端口 ? 行13 : `${主机部分}:${端口12}${备注}`);
        });
      } else {
        const 头部列表 = 行列表[0].split(',').map(头值11 => 头值11.trim());
        const 数据行列表 = 行列表.slice(1);
        if (头部列表.includes('IP地址') && 头部列表.includes('端口') && 头部列表.includes('数据中心')) {
          const 地址索引10 = 头部列表.indexOf('IP地址'),
            端口索引 = 头部列表.indexOf('端口');
          const 备注索引 = 头部列表.indexOf('国家') > -1 ? 头部列表.indexOf('国家') : 头部列表.indexOf('城市') > -1 ? 头部列表.indexOf('城市') : 头部列表.indexOf('数据中心');
          const 传输层安全索引 = 头部列表.indexOf('TLS');
          数据行列表.forEach(行9 => {
            const 列列表8 = 行9.split(',').map(丙值7 => 丙值7.trim());
            if (传输层安全索引 !== -1 && 列列表8[传输层安全索引]?.toLowerCase() !== 'true') return;
            const 包裹地址6 = 六版地址模式.test(列列表8[地址索引10]) ? `[${列列表8[地址索引10]}]` : 列列表8[地址索引10];
            结果列表.add(`${包裹地址6}:${列列表8[端口索引]}#${列列表8[备注索引]}`);
          });
        } else if (头部列表.some(头值5 => 头值5.includes('IP')) && 头部列表.some(头值4 => 头值4.includes('延迟')) && 头部列表.some(头值3 => 头值3.includes('下载速度'))) {
          const 地址索引 = 头部列表.findIndex(头值2 => 头值2.includes('IP'));
          const 延迟索引 = 头部列表.findIndex(头值1 => 头值1.includes('延迟'));
          const 速度索引 = 头部列表.findIndex(头值 => 头值.includes('下载速度'));
          const 端口 = new URL(网址).searchParams.get('port') || 默认端口;
          数据行列表.forEach(行 => {
            const 列列表 = 行.split(',').map(丙值 => 丙值.trim());
            const 包裹地址 = 六版地址模式.test(列列表[地址索引]) ? `[${列列表[地址索引]}]` : 列列表[地址索引];
            结果列表.add(`${包裹地址}:${端口}#CF优选 ${列列表[延迟索引]}ms ${列列表[速度索引]}MB/s`);
          });
        }
      }
    } catch (事件值) {}
  }));
  return Array.from(结果列表);
}
