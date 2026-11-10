/* Called on the screen's HTML before chrome wraps it. Text lives in the pure Story helpers. */
function enrichStory(inner) {
  const match = /<section class="screen ([^"]+)"/.exec(inner);
  if (!match) return inner;
  const classes = match[1].split(/\s+/), kind = classes[0];
  const block = lines => lines.map(t => `<p class="long-story" data-narrate>${esc(t)}</p>`).join('');
  let lines = [];
  if (kind === 'intro') {
    return inner.replace(/(<p class="story" data-narrate>[\s\S]*?<\/p>)/, '$1' + block(ST.roomPage(S, 'arrival')));
  }
  if (kind === 'results') {
    const pv = E.preview(S);
    /* Move-specific cards stay intact. The room gets a longer shared aftermath as well. */
    return inner.replace(/(<div class="resgrid">[\s\S]*?<\/article><\/div>)/, '$1' + block(ST.resultScene(S, pv.ev.tier)));
  }
  if (kind === 'choose') lines = classes.includes('locked') ? ST.pageScene(S, 'locked') : ST.roomPage(S, 'choice');
  else if (kind === 'stall') {
    const k = Math.max(0, S.shop.at.indexOf(S.room));
    lines = ST.pageScene(S, k === 1 ? 'stall2' : 'stall');
    return inner.replace(/(<p class="story">[\s\S]*?<\/p>)/, '$1' + block(lines));
  } else if (classes.includes('waitroom')) lines = ST.pageScene(S, 'waiting');
  else lines = ST.pageScene(S, kind);
  if (!lines.length) return inner;
  /* Story follows the existing practical introduction, so instructions and forms remain clear. */
  const lead = kind === 'title' ? /(<p class="tag">[\s\S]*?<\/p>)/ : kind === 'ending' ? /(<p class="sub center">[\s\S]*?<\/p>)/ : /(<p class="lead">[\s\S]*?<\/p>)/;
  if (lead.test(inner)) return inner.replace(lead, '$1' + block(lines));
  return inner.replace(/(<h[12][^>]*>[\s\S]*?<\/h[12]>)/, '$1' + block(lines));
}
