/* Two Lanterns :: the Undertoll art edition. Assets are embedded by build-art.cjs. */
(function (g) {
'use strict';
const assets = __ART_ASSETS__;
const manifest = __ART_MANIFEST__;
const PC = ['#e4ae60', '#81cbb1'];
const FLAMES = { tallow: '#e6ae60', witchfire: '#b4d9ee', glowmoss: '#87d3ae', saintoil: '#eee2ab' };
const ORIGINS = { ringer: '#bca57a', dock: '#80b8bd', barrow: '#8f9f7d', priory: '#c4c3ad' };
const CALLINGS = { guard: 'Bellguard', thief: 'Cutpurse', witch: 'Candlewitch', cantor: 'Cantor' };
const KEEPSAKES = { clapper: 'clapper', letter: 'envelope', locket: 'locket', coin: 'coin' };
let serial = 0;
const uid = () => 'undertoll-' + (++serial);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path = d => '<path d="' + d + '"/>';
const dot = (x,y,r=2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
const I = {
  hammer: path('M14 13L45 9L50 23L19 28ZM31 27L35 54L29 57L25 29M19 18L40 15M29 44L34 43'),
  shield: path('M32 5L52 13L49 36Q46 49 32 59Q17 49 14 36L12 13ZM32 13V47M24 23L32 17L40 23M24 35L32 41L40 35'),
  dagger: path('M34 5L39 31L31 39L25 31ZM19 38L43 34M31 39L33 52L29 57L25 52L27 40M33 13L31 29'),
  sword: path('M32 4L38 13L35 38L29 38L26 13ZM20 39L44 39M29 40L29 53L32 58L35 53L35 40M32 12V30'),
  eye: path('M5 32Q29 8 59 32Q35 56 5 32ZM31 20Q42 21 42 32Q40 44 30 44Q20 42 20 32Q21 21 31 20M31 26V38M12 17L16 21M48 21L52 17'),
  flame: path('M32 5C34 18 49 24 48 39C48 51 39 59 29 57C13 54 10 41 18 29L23 36C23 22 33 20 32 5ZM31 35C21 44 25 52 32 53C40 49 37 44 31 35Z'),
  book: path('M31 15Q20 9 7 14L8 51Q22 47 31 54Q43 47 56 51L57 14Q44 9 33 15L31 54M14 23Q21 21 26 24M14 31L25 32M39 24L49 22M39 32L49 31M39 40L47 39'),
  scroll: path('M14 11Q8 11 8 17Q8 23 16 23L16 48Q16 55 23 55H49Q57 55 57 48Q57 42 49 42H24M15 11H46V42M21 11V19M23 27H38M23 34H35M23 42V49Q23 55 16 54'),
  key: path('M24 10C8 7 5 29 19 34C31 38 38 21 30 13ZM22 18Q15 18 16 25Q21 31 27 24ZM30 30L53 53M42 40L48 35M48 47L55 40M51 53L56 48'),
  skull: path('M18 45C4 32 11 7 31 6C52 5 59 31 47 44L45 55L20 56ZM18 29L26 27L25 36L18 35ZM38 27L46 29L45 35L38 36ZM32 36L28 43H35ZM26 49V55M33 49V55M39 48V55'),
  bell: path('M27 13Q26 4 32 4Q38 4 37 13M14 47Q20 39 19 29Q18 13 32 12Q46 13 45 29Q44 39 51 47ZM11 50L53 50M27 53Q32 63 37 53M26 21Q23 28 24 36M33 18L30 29L35 34L32 44'),
  coin: path('M32 6C48 6 58 20 56 35C55 50 41 60 27 57C11 55 4 42 7 27C9 13 20 6 32 6ZM32 12C20 12 12 22 13 34C13 45 22 52 33 51C44 51 51 42 50 31C50 20 43 12 32 12ZM32 20L38 31L32 44L26 32ZM9 23L13 25M49 43L53 45'),
  coins: path('M11 23V49Q30 64 53 49V23M11 33Q31 47 53 33M11 42Q31 56 53 42M11 23C11 8 53 8 53 23C53 35 11 35 11 23ZM21 21L32 17L43 22L32 26Z'),
  chest: path('M8 29Q8 12 30 10Q53 9 56 28V53L9 54ZM9 30L56 28M19 13V52M45 13L46 52M26 28V39L38 38V27M32 32V36M12 46L16 46M49 44L53 44'),
  door: path('M10 58V26Q12 10 32 5Q53 11 55 27V58M20 57V30Q21 20 32 15Q44 21 44 30V57M31 18V57M24 39L27 39M36 39L39 39M7 58H58'),
  stairs: path('M6 56H58M10 56V45H22V34H34V23H46V12H57M10 45L16 50M23 34L29 39M35 23L40 28M10 17L15 11L21 17M15 11V33'),
  wave: path('M5 20Q13 12 21 20T37 20T53 20L59 18M5 34Q13 26 21 34T37 34T53 34L59 32M5 48Q13 40 21 48T37 48T53 48L59 46'),
  note: path('M35 11V45Q30 56 20 53Q12 48 19 42Q25 37 35 41M35 11Q48 10 53 26Q45 19 35 22M15 16L19 12M22 23L25 19'),
  heart: path('M32 56C25 47 7 37 7 23C7 9 24 7 32 20C40 6 57 10 57 23C57 37 39 48 32 56ZM16 22Q16 15 23 19M29 29L34 36L29 42L33 49'),
  star: path('M32 5L38 25L58 31L38 37L32 59L26 38L6 32L26 25ZM32 20V43M20 32H44'),
  crown: path('M10 19L23 31L32 11L41 31L54 18L48 49H16ZM16 42L48 42M20 54H44M30 33L32 28L34 33L32 38Z'),
  mirror: path('M32 5C6 6 6 45 32 47C58 44 58 6 32 5ZM32 11C14 12 14 39 32 41C50 39 50 11 32 11ZM29 47L27 58H37L35 47M25 22L35 17M23 30L39 21M39 30L43 27'),
  mushroom: path('M6 32Q10 9 32 7Q55 10 59 32Q32 40 6 32ZM25 37L23 53Q32 61 41 53L38 37M13 27Q19 17 25 16M37 16L44 24M30 23L29 27M31 40V49'),
  spider: path('M28 17Q33 10 38 18L38 23Q47 29 43 43Q37 58 26 47Q18 32 27 23ZM25 27L16 20L9 7M24 33L12 29L4 20M24 40L11 45L6 58M40 26L49 17L55 6M43 33L55 29L61 19M43 42L53 46L59 58')+dot(30,21,1.5)+dot(35,21,1.5),
  web: path('M32 5V59M5 32H59M11 11L53 53M53 11L11 53M32 13Q38 23 51 13Q42 27 54 32Q42 37 51 51Q38 41 32 54Q27 42 13 51Q23 38 10 32Q22 26 13 13Q26 22 32 13ZM32 23Q36 28 43 23Q38 29 43 32Q38 36 42 42Q36 38 32 43Q28 38 23 43Q27 36 21 32Q27 29 23 23Q29 28 32 23Z'),
  rope: path('M22 4C46 16 13 24 32 36C49 47 16 52 30 61M34 3C58 16 25 25 44 36C59 46 29 53 42 61M22 12L38 16M23 27L36 24M28 35L42 31M33 46L43 40M28 54L41 51'),
  torch: path('M25 33L28 57L35 58L38 33M22 31L42 31M25 38L38 36M32 5C32 16 45 16 42 26Q31 38 21 25Q17 18 24 14L26 22Q32 17 32 5Z'),
  potion: path('M24 6H40V13H37L37 23L51 45Q57 57 43 58H21Q7 56 13 45L27 23V13H24ZM23 40Q32 45 42 40M18 48Q21 52 27 52M27 13H37M30 31L34 32'),
  ring: path('M19 25C2 41 21 66 39 56C56 48 53 32 43 25M23 28C12 39 24 56 36 50C47 44 45 34 40 30M22 15L31 5L42 14L34 28ZM31 5L33 26M23 15L42 14'),
  feather: path('M52 6Q19 7 12 49L18 53Q47 45 52 6ZM8 60L43 17M21 39L20 28M29 30L29 18M23 43L36 41M34 29L44 26'),
  ghost: path('M13 57L14 25Q14 7 32 6Q51 9 50 28L52 59L41 51L34 59L26 53L18 60ZM20 38Q32 43 44 38')+dot(25,27)+dot(39,27),
  cross: path('M28 5H36L35 23L52 22V31L35 30L37 57H27L29 30L12 31V22L29 23ZM23 53L20 58M42 53L45 58'),
  anchor: path('M32 18V55M25 10Q25 3 32 3Q40 4 39 11Q38 19 31 18Q25 17 25 10ZM18 27H46M9 35Q13 53 32 57Q51 52 55 35M9 35L7 44M9 35L18 39M55 35L57 44M55 35L46 39'),
  mask: path('M10 15Q20 9 32 15Q44 9 55 15L51 38Q45 51 32 57Q17 48 13 36ZM18 28L26 26L25 32L19 32ZM38 26L47 28L46 32L39 32ZM32 33L29 41H35M24 45Q32 49 40 45'),
  gem: path('M19 8L46 10L59 26L32 58L5 25ZM5 25L59 26M19 8L22 25L32 58L43 26L46 10M22 25L32 12L43 26'),
  fang: path('M16 8Q32 14 49 7Q46 38 27 59Q27 31 16 8ZM25 18Q33 32 30 46M22 12L44 13'),
  hourglass: path('M14 6H50M14 58H50M18 8C17 22 28 27 30 32C25 38 18 43 18 56M46 8C46 23 35 27 34 32C40 38 46 43 46 56M23 17H41L32 27ZM23 51L32 41L42 51ZM32 31V36'),
  candle: path('M23 29Q32 34 41 29V56H22ZM23 30L27 32V42Q31 47 33 40V33M32 22V30M32 5C32 13 41 13 39 21Q32 28 26 21Q22 16 32 5ZM16 58H47'),
  shovel: path('M24 6H41L38 18L27 19ZM32 18V39M21 39H44L43 49Q40 57 32 61Q22 55 21 47ZM27 45L32 53L37 45'),
  envelope: path('M7 17L56 14L59 49L9 53ZM7 17L34 36L56 14M10 49L26 33M42 32L57 46M29 37Q34 32 39 38L38 43L33 46L29 42Z'),
  locket: path('M20 21Q8 9 19 5Q32 0 44 6Q55 11 44 21M32 19C9 20 9 53 32 59C55 52 56 20 32 19ZM32 25C17 27 17 48 32 52C47 47 47 26 32 25ZM32 32V44M28 37H36'),
  clapper: path('M27 9Q26 3 32 3Q39 4 38 10Q36 17 30 14Q27 13 27 9ZM30 15L29 39M35 15L35 39M30 39C14 41 16 60 32 60C48 59 49 42 35 39M23 46Q20 51 26 55'),
  scale: path('M31 7L33 56M23 58H43M9 18L55 13M16 18L6 38H25ZM48 15L38 35H58ZM6 38Q16 51 25 38M38 35Q48 47 58 35M31 7L27 12L32 17L37 12Z'),
  chain: path('M26 21L19 21C3 21 3 44 18 44H28Q41 42 38 31M38 43H46C61 43 60 20 46 20H36Q24 22 26 34M21 32H44'),
  check: path('M9 34L24 49L55 13M9 42L22 55M45 12L50 7'),
  scratch: path('M14 8L28 55M28 6L43 57M43 9L56 51M12 21L19 17M34 42L43 39'),
  net: path('M11 10Q32 17 54 9L55 51Q30 46 10 56ZM11 24Q32 30 54 23M11 40Q32 35 54 39M25 14L24 51M41 13L40 49M9 6L11 10M56 5L54 9M8 60L10 56M58 55L55 51'),
  dice: path('M10 15L45 7L56 19L53 52L19 58L8 45ZM10 15L21 27L56 19M21 27L19 58M45 7L44 18')+dot(30,35)+dot(43,42)+dot(32,49)+dot(38,16),
  ear: path('M17 27C10 3 45 1 49 21C52 37 34 41 33 51Q30 61 21 56M23 25C20 13 38 10 41 22Q43 32 31 35L27 42M30 24L33 30'),
  fist: path('M15 37L14 21Q15 15 21 18L22 29L21 12Q24 6 29 12L30 28V9Q35 4 38 11L39 28L40 14Q45 10 48 17V34L52 30Q59 29 58 36L46 53L44 59H22L22 52Q13 48 10 40Q8 34 15 37ZM23 36Q34 42 45 37M24 48L42 48'),
  moth: path('M31 21Q17 4 6 12L11 35L23 37L12 48Q20 62 31 43M35 21Q48 5 59 13L54 36L43 37L54 49Q44 60 35 43M32 20V47M32 20L26 10M34 20L40 10M14 20L22 25L16 29ZM49 20L43 25L49 29Z'),
  pick: path('M10 24Q28 2 55 21L52 26Q35 14 15 29ZM33 20L24 57L30 59L39 23M29 43L34 45'),
  horseshoe: path('M22 9C5 15 7 50 22 57Q32 63 43 57C57 48 58 18 44 9L39 20C47 29 46 46 38 49Q32 52 26 48C17 44 19 27 26 20ZM18 20L21 22M15 33L19 33M18 45L21 44M43 21L46 20M46 32L50 32M43 44L47 46'),
  window: path('M11 57V27Q12 12 32 5Q52 13 53 27V57ZM32 7V57M12 30H52M12 44H52M32 9L20 29L32 42L44 29ZM20 45L32 56L44 45'),
  flower: path('M32 58V34M31 47Q16 50 12 38Q27 36 31 47M34 41Q47 43 53 31Q38 29 34 41M32 34Q12 31 13 20Q13 13 24 19Q22 6 31 5Q42 7 38 19Q50 11 53 21Q53 32 32 34ZM32 19L26 25L32 31L39 25Z')
};
function lampIcon(kind) {
  const moss = kind === 'glowmoss';
  const cage = moss ? path('M23 18H42L43 26Q49 34 46 50Q32 58 18 50Q15 35 22 26ZM22 18V13H42V18M18 43H46') : path('M25 17Q22 6 32 5Q42 6 39 17M20 23L26 16H39L46 23L43 49L37 55H25L19 49ZM20 23H46M22 49H43M26 24L27 48M38 24L37 48M17 57H47');
  if (moss) return cage + path('M24 44L27 33L31 43L36 30L39 44M26 34L22 31M36 33L41 29') + dot(28,27,1.5);
  if (kind === 'witchfire') return cage + path('M31 25L29 35L25 32L28 45L33 49L38 43L37 33L33 37Z');
  if (kind === 'saintoil') return cage + '<circle cx="32" cy="37" r="10" opacity=".6"/>' + path('M32 29Q23 42 32 46Q41 42 32 29Z');
  return cage + path('M32 28Q21 41 31 47Q42 44 32 28Z');
}
I.lantern = I.lantern_tallow = lampIcon('tallow');
I.lantern_witch = lampIcon('witchfire');
I.lantern_moss = lampIcon('glowmoss');
I.lantern_saint = lampIcon('saintoil');
function icon(name,cls) {
  return `<svg class="ic${cls?' '+esc(cls):''}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${I[name] || I.star}</svg>`;
}
function die(n) {
  const positions = {1:[[32,32]],2:[[21,21],[43,43]],3:[[20,20],[32,32],[44,44]],4:[[21,21],[43,21],[21,43],[43,43]],5:[[20,20],[44,20],[32,32],[20,44],[44,44]],6:[[21,18],[43,18],[21,32],[43,32],[21,46],[43,46]]};
  const pips = positions[n];
  return `<svg class="dieface" viewBox="0 0 64 64" role="img" aria-label="${pips?'Rolled '+n:'Unrolled die'}"><path d="M11 5L51 6L59 14L57 52L50 59L12 58L5 50L6 13Z" fill="#c5c8b8" stroke="#17262b" stroke-width="2"/><path d="M13 10L49 11L54 16L52 49L47 54L15 53L10 48L11 16Z" fill="none" stroke="#657574" stroke-width="1"/><path d="M6 27L11 29M51 58L49 53M37 6L35 11" stroke="#536865" stroke-width="1.5"/>${pips?pips.map(([x,y])=>`<path d="M${x} ${y-3.7}L${x+3.5} ${y}L${x} ${y+3.7}L${x-3.5} ${y}Z" fill="#14272c"/>`).join(''):'<path d="M27 24Q27 17 34 20Q42 24 34 30L31 36M31 43V44" fill="none" stroke="#253b40" stroke-width="3" stroke-linecap="round"/>'}</svg>`;
}
function lamp(kind,who,u,x=103,y=103,scale=.43,dim=false) {
  const col=FLAMES[kind] || PC[who?1:0], moss=kind==='glowmoss';
  return `<g transform="translate(${x} ${y}) scale(${scale})" class="held-lamp" data-flame="${esc(kind||'unselected')}"><defs><radialGradient id="${u}-light"><stop stop-color="${col}" stop-opacity=".65"/><stop offset=".35" stop-color="${col}" stop-opacity=".18"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="35" r="72" fill="url(#${u}-light)" opacity="${dim?.22:1}"/><g fill="#0b1116" stroke="#61726c" stroke-width="2.2" stroke-linejoin="round"><path d="M24 16Q22 4 32 4Q42 4 40 16" fill="none"/>${moss?'<path d="M22 17H42L43 25Q50 33 46 50Q32 56 18 50Q14 34 21 25Z"/>':'<path d="M19 24L26 16H39L46 24L43 50L37 55H25L19 50Z"/>'}</g><g opacity="${dim?.25:1}" fill="${col}">${moss?'<path d="M21 46Q22 36 28 40Q33 32 37 39Q44 35 44 47Q33 52 21 46Z"/><circle cx="27" cy="33" r="2"/><circle cx="38" cy="29" r="2"/>':kind==='witchfire'?'<path d="M31 26L28 36L24 34L27 45L33 49L39 43L36 32L33 38Z"/>':'<path d="M32 27C33 34 40 37 38 43Q33 53 26 44Q23 37 32 27Z"/>'}${kind==='saintoil'?`<circle cx="32" cy="38" r="12" fill="none" stroke="${col}" stroke-width="1.2" opacity=".8"/>`:''}</g>${moss?'':`<path d="M20 24H46M22 50H43M27 25L28 49M38 25L37 49M18 57H46" fill="none" stroke="#52615b" stroke-width="2"/>`}</g>`;
}
function portrait(c,who) {
  c=c||{}; who=who===1?1:0;
  const u=uid(),calling=CALLINGS[c.calling]?c.calling:'thief',source=assets['portraits/'+calling],origin=ORIGINS[c.origin]||'#748b91';
  const keepsake=KEEPSAKES[c.keepsake];
  const hand=({guard:[109,92],thief:[103,98],witch:[93,111],cantor:[88,98]})[calling];
  const cord=`<path d="M${hand[0]} ${hand[1]}Q112 ${hand[1]-3} 114.4 104.4" fill="none" stroke="#6b7e77" stroke-width="1.1" opacity=".85"/>`;
  const name=[CALLINGS[c.calling]||'Lantern-bearer',c.origin&&'from '+c.origin,c.lantern&&'with '+c.lantern+' light',c.keepsake&&'carrying '+c.keepsake].filter(Boolean).join(', ');
  return `<svg class="portrait shadow-portrait" viewBox="0 0 144 180" role="img" aria-label="${esc(name)}" data-calling="${esc(c.calling||'unselected')}" data-origin="${esc(c.origin||'unselected')}" data-keepsake="${esc(c.keepsake||'unselected')}" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${u}-halo"><stop stop-color="${PC[who]}" stop-opacity=".13"/><stop offset="1" stop-color="${PC[who]}" stop-opacity="0"/></radialGradient></defs><path d="M18 165V62Q20 21 71 7Q125 23 127 63V165Z" fill="#0a1016" stroke="${origin}" stroke-opacity=".34"/><circle cx="77" cy="102" r="68" fill="url(#${u}-halo)"/><path d="M71 10L75 17L71 24L67 17Z" fill="${origin}" opacity=".9"/><image class="portrait-body" href="${source}" x="12" y="19" width="111" height="153" preserveAspectRatio="xMidYMax meet"/>${cord}${lamp(c.lantern,who,u,99,102,.48,!c.lantern)}${keepsake?`<g transform="translate(13 137) scale(.34)" fill="#101a20" stroke="${origin}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 1H62V62H2Z" fill="#0a1117" stroke-opacity=".5"/>${I[keepsake]}</g>`:''}<path d="M27 172H116" stroke="${PC[who]}" stroke-opacity=".5"/><path d="M68 172L72 168L76 172L72 176Z" fill="${PC[who]}"/></svg>`;
}
function endingFigures(o) {
  const fates=o.fates||['whole','whole'],picks=o.picks||[{},{}];
  return fates.map((f,i)=>{
    const c=picks[i]||{},u=uid(),kind=CALLINGS[c.calling]?c.calling:'thief';
    let x=i?590:207,y=425,size=112,rotate=0,sy=1,op=1;
    if(f==='weary'){rotate=i?-9:9;sy=.92;}
    if(f==='ruined'){sy=.63;rotate=i?-13:13;}
    if(f==='fallen'){rotate=i?-86:86;size=95;x=i?620:177;y=427;op=.65;}
    if(f==='carried'){x=i?248:548;y=365;rotate=i?-80:80;size=83;}
    if(f==='thief'){rotate=i?15:-15;}
    if(f==='keeper'||f==='bound'){x=i?483:337;y=386;size=91;sy=f==='keeper'?.76:1;}
    if(f==='martyr'){x=i?450:350;y=330;size=125;op=.5;}
    const w=size*.8, chains=f==='bound'?'<path d="M-33 -65L33 -27M33 -70L-31 -23M-27 -23L-54 0M28 -25L54 0" fill="none" stroke="#91a09b" stroke-width="2.3" stroke-dasharray="5 3"/>':'';
    const stool=f==='keeper'?'<path d="M-28 -18H26M-24 -18L-28 4M20 -18L25 4" fill="none" stroke="#4c605c" stroke-width="4"/>':'';
    const col=PC[i];
    const ghost=f==='martyr'?`<defs><filter id="${u}-ghost"><feColorMatrix type="matrix" values="0 0 0 0 .56 0 0 0 0 .81 0 0 0 0 .73 0 0 0 1 0"/></filter></defs>`:'';
    return `<g class="ending-figure fate-${esc(f)}" data-who="${i}" data-fate="${esc(f)}" transform="translate(${x} ${y})" opacity="${op}"><ellipse cy="1" rx="${w*.5}" ry="5" fill="#000" opacity=".5"/>${stool}${ghost}<g transform="rotate(${rotate}) scale(1 ${sy})"><image href="${assets['portraits/'+kind]}" x="${-w/2}" y="${-size}" width="${w}" height="${size}" preserveAspectRatio="xMidYMax meet"${f==='martyr'?` filter="url(#${u}-ghost)"`:''}/>${chains}</g>${f==='fallen'?lamp(c.lantern,i,u,32,-18,.33,true):f==='carried'?'':lamp(c.lantern,i,u,w*.26-6,-size*.54*sy,.42)}${f==='martyr'?`<ellipse cx="0" cy="${-size*.5}" rx="${w*.5}" ry="${size*.6}" fill="${col}" opacity=".13"/>`:''}</g>`;
  }).join('');
}
function scene(name,o) {
  o=o||{};
  const id=name==='end'?'end-'+((o.dun||{}).kind||'ring'):name;
  const source=assets['scenes/'+id];
  if(!source)throw Error('Missing Undertoll art: '+id);
  const u=uid(),tier=Number.isInteger(o.tier)?o.tier:null;
  const tierColors=['#8e3c42','#a98b5c','#72a793','#d4c28f'];
  let overlay='';
  if(tier!==null)overlay+=`<path d="M0 449H800" stroke="${tierColors[tier]}" stroke-width="5" opacity=".75"/>`;
  if(o.who===0||o.who===1)overlay+=`<path d="M0 0V450H800V0" fill="none" stroke="${PC[o.who]}" stroke-width="4" opacity=".5"/>`;
  if(name==='end')overlay+=endingFigures(o);
  const motes=Array.from({length:7},(_,i)=>`<circle cx="${100+(i*137)%620}" cy="${70+(i*63)%300}" r="${i%2?.7:1.1}" fill="#b9cac3" opacity="${.08+(i%3)*.03}"/>`).join('');
  return `<svg class="art undertoll-scene" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(o.label||manifest.labels[name]||name)}" data-scene="${esc(name)}" data-asset="${esc(id)}"${tier===null?'':` data-tier="${tier}"`} xmlns="http://www.w3.org/2000/svg"><image class="scene-paint" href="${source}" width="800" height="450" preserveAspectRatio="xMidYMid slice"/><g class="scene-motes" aria-hidden="true">${motes}</g>${overlay}</svg>`;
}
g.Art={scene,portrait,icon,die,names:manifest.scenes.slice(),ROOMS:manifest.rooms.slice(),icons:Object.keys(I),edition:'Undertoll',assetCount:Object.keys(assets).length,manifest};
})(typeof window!=='undefined'?window:globalThis);
