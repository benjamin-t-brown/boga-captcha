export const getScoreTarget = () => {
  const params = window.location.search.split('?')[1];
  const paramsObj = new URLSearchParams(params);
  const scoreTarget = paramsObj.get('score-target') ?? '15000';
  return parseInt(scoreTarget);
};

export const getNumReserveBalls = () => {
  const params = window.location.search.split('?')[1];
  const paramsObj = new URLSearchParams(params);
  const numReserveBalls = paramsObj.get('num-reserve-balls') ?? '20';
  return parseInt(numReserveBalls);
};
