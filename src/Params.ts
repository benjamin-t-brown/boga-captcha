export const getScoreTarget = () => {
  const params = window.location.search.split('?')[1];
  const paramsObj = new URLSearchParams(params);
  const scoreTarget = paramsObj.get('scoreTarget') ?? '15000';
  return parseInt(scoreTarget);
};
