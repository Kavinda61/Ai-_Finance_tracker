import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Bot } from 'lucide-react';
import './App.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
const chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#22C55E', '#F97316'];

function getRequestError(error, fallback) {
  const apiError = error.response?.data?.error;
  if (typeof apiError === 'string') return apiError;
  if (error.response?.status === 404) {
    return 'Backend API එක හමු නොවීය. නිවැරදි backend server එක නැවත start කර Retry කරන්න.';
  }
  return fallback;
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState('');
  const [transactionActionError, setTransactionActionError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    setTransactionsError('');
    try {
      const res = await axios.get(`${API_URL}/transactions`);
      if (!Array.isArray(res.data)) {
        throw new Error('Transactions API returned an unexpected response.');
      }
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      setTransactionsError(
        getRequestError(err, 'Database දත්ත ලබාගත නොහැක. Backend server එක ක්‍රියාත්මකදැයි පරීක්ෂා කර නැවත උත්සාහ කරන්න.')
      );
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    setTransactionActionError('');
    try {
      await axios.post(`${API_URL}/transactions`, formData);
      setFormData({
        title: '',
        amount: '',
        type: 'expense',
        category: 'Food',
        date: new Date().toISOString().split('T')[0]
      });
      await fetchTransactions();
    } catch (err) {
      console.error(err);
      setTransactionActionError(getRequestError(err, 'Transaction එක database එකට save කළ නොහැක.'));
    }
  };

  const handleDelete = async (id) => {
    setTransactionActionError('');
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      await fetchTransactions();
    } catch (err) {
      console.error(err);
      setTransactionActionError(getRequestError(err, 'Transaction එක database එකෙන් delete කළ නොහැක.'));
    }
  };

  const getAiAdvice = async () => {
    setLoadingAi(true);
    try {
      const res = await axios.post(`${API_URL}/ai-insights`);
      setAiAdvice(res.data.advice);
    } catch (err) {
      setAiAdvice(getRequestError(err, 'AI සේවාවට සම්බන්ධ විය නොහැක. Backend server එක ක්‍රියාත්මකදැයි පරීක්ෂා කරන්න.'));
    } finally {
      setLoadingAi(false);
    }
  };

  // Financial Summary Calculation
  const totalIncome = transactions
    .filter(t => String(t.type).toLowerCase() === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => String(t.type).toLowerCase() === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  const expensesByCategory = transactions
    .filter(t => String(t.type).toLowerCase() === 'expense')
    .reduce((totals, transaction) => {
      const category = String(transaction.category || 'Other').trim() || 'Other';
      totals[category] = (totals[category] || 0) + Number(transaction.amount);
      return totals;
    }, {});
  const categories = Object.keys(expensesByCategory);
  const chartData = {
    labels: categories,
    datasets: [
      {
        label: 'Expenses',
        data: categories.map(category => expensesByCategory[category]),
        backgroundColor: categories.map((_, index) => chartColors[index % chartColors.length]),
        borderColor: '#ffffff',
        borderWidth: 2
      }
    ]
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: context => ` ${context.label}: LKR ${Number(context.raw).toLocaleString()}`
        }
      }
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1><DollarSign size={32} /> AI Personal Finance & Expense Tracker</h1>
      </header>

      {transactionsError && (
        <div className="data-error" role="alert">
          <span>{transactionsError}</span>
          <button type="button" onClick={fetchTransactions} disabled={loadingTransactions}>
            {loadingTransactions ? 'Loading...' : 'Retry'}
          </button>
        </div>
      )}
      {transactionActionError && <p className="data-error" role="alert">{transactionActionError}</p>}

      {/* Cards Section */}
      <div className="summary-cards">
        <div className="card balance">
          <h3>Total Balance</h3>
          <p>LKR {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card income">
          <h3><TrendingUp color="green" /> Total Income</h3>
          <p>LKR {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card expense">
          <h3><TrendingDown color="red" /> Total Expense</h3>
          <p>LKR {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="main-grid">
        {/* Form & List Section */}
        <div className="left-panel">
          <form className="transaction-form" onSubmit={handleSubmit}>
            <h3>Add Transaction</h3>
            <input 
              type="text" 
              placeholder="Title (e.g. Supermarket)" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              required 
            />
            <input 
              type="number" 
              placeholder="Amount (LKR)" 
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: e.target.value})} 
              required 
            />
            <div className="row">
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="Food">Food</option>
                <option value="Utilities">Utilities</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Salary">Salary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <input 
              type="date" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
            <button type="submit"><Plus size={18} /> Add Entry</button>
          </form>

          {/* AI Insights Card */}
          <div className="ai-box">
            <button className="ai-btn" onClick={getAiAdvice} disabled={loadingAi}>
              <Bot size={20} /> {loadingAi ? 'Analyzing Data...' : 'Get Groq AI Savings Advice'}
            </button>
            {aiAdvice && (
              <div className="ai-advice-content">
                <h4>Smart Financial Advice:</h4>
                <p>{aiAdvice}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart & History Section */}
        <div className="right-panel">
          <div className="chart-box">
            <h3>Expenses Breakdown</h3>
            {loadingTransactions ? (
              <p className="chart-empty">Loading expense data...</p>
            ) : categories.length > 0 ? (
              <div className="chart-wrapper">
                <Pie data={chartData} options={chartOptions} />
              </div>
            ) : (
              <p className="chart-empty">No expense data available to display yet.</p>
            )}
          </div>

          <div className="history-box">
            <h3>Recent Transactions</h3>
            <ul>
              {transactions.length === 0 ? (
                <li className="empty-history">
                  {loadingTransactions ? 'Loading database transactions...' : 'No transactions to display.'}
                </li>
              ) : transactions.map(t => (
                <li key={t.id} className={t.type}>
                  <div>
                    <strong>{t.title}</strong> ({t.category})
                    <span className="date">{new Date(t.date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="amount">
                      {String(t.type).toLowerCase() === 'income' ? '+' : '-'} LKR {Number(t.amount).toLocaleString()}
                    </span>
                    <button className="delete-btn" onClick={() => handleDelete(t.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;