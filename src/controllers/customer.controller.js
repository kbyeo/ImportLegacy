const customerService = require('../services/customer.service');

async function listCustomers(req, res, next) {
  try {
    const { page, limit, email, fullName } = req.query;
    const { customers, pagination } = await customerService.listCustomers({
      page,
      limit,
      email,
      fullName,
    });

    res.status(200).json({
      success: true,
      data: customers,
      pagination,
    });
  } catch (err) {
    next(err);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    next(err);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const isPatch = req.method === 'PATCH';
    const customer = await customerService.updateCustomer(req.params.id, req.body, isPatch);
    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listCustomers, getCustomer, updateCustomer, deleteCustomer };
