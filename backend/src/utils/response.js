function sendData(res, result) {
  const source = result?.source ?? 'unknown';
  res.set('X-Data-Source', source);

  if (result?.stats !== undefined) {
    return res.json({ data: result.data, stats: result.stats });
  }

  if (result?.pagination) {
    return res.json({
      data: result.data,
      pagination: result.pagination,
    });
  }

  return res.json(result?.data !== undefined ? result.data : result);
}

module.exports = { sendData };
