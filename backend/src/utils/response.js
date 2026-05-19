function sendData(res, result) {
  const { data, source, pagination, stats } = result || {};
  const dataSource = source || 'wazuh';
  res.set('X-Data-Source', dataSource);

  const response = { data };
  if (pagination) response.pagination = pagination;
  if (stats) response.stats = stats;

  return res.json(response);
}

module.exports = { sendData };
