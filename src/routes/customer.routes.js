const { Router } = require('express');
const {
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customer.controller');

const router = Router();

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.put('/:id', updateCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;
