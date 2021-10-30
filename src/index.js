const express = require('express');
const { v4: uuid } = require('uuid');

const PORT = 3333;

const app = express();
app.use(express.json());

const customers = [];

//Middleware
const verifyIfExistsAccountCPF = (request, response, next) => {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: 'Customer not found!' });
  }

  request.customer = customer;

  return next();
};

function getBalance(statement) {
  const balance = statement.reduce(
    (acc, operation) =>
      operation.type === 'credit'
        ? acc + operation.amount
        : acc - operation.amount,
    0
  );

  return balance;
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: 'Customer already exists!' });
  }

  customers.push({
    name,
    id: uuid(),
    cpf,
    statement: [],
  });

  return response.status(201).send();
});

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.json(customer);
});

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.json(customers).status(200);
});

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body;

  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: 'Insufficient funds!' });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { date } = request.query;
  const { customer } = request;

  const statement = customer.statement.filter((statement) =>
    statement.created_at.toISOString().includes(date)
  );

  return response.json(statement);
});

app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
});

app.listen(PORT, () => {
  console.log(`Rodando na porta ${PORT}`);
});
