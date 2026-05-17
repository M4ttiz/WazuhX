function sendData(res, result) {
  res.set('X-Data-Source', result.source || 'mock');
  if (result.pagination) {
    return res.json({
      data: result.data,
      pagination: result.pagination,
    });
  }
  return res.json(result.data !== undefined ? result.data : result);
}

module.exports = { sendData };
