class BudgetTracker {
    constructor() {
        this.categories = JSON.parse(localStorage.getItem('budgetCategories')) || [];
        this.transactions = JSON.parse(localStorage.getItem('budgetTransactions')) || [];
        this.chart = null;
        this.currentEditId = null;
        this.customDateRange = {
            startDate: null,
            endDate: null
        };
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.loadCategories();
        this.updateTotalBudget();
        this.loadTransactions();
        this.setupChart();
        this.setMinDate();
        this.setupModal();
        this.updateChart();
    }

    setMinDate() {
        const dateInput = document.getElementById('spending-date');
        const editDateInput = document.getElementById('edit-date');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        const today = new Date().toISOString().split('T')[0];
        
        dateInput.value = today;
        dateInput.max = today;
        editDateInput.value = today;
        editDateInput.max = today;
        startDateInput.value = this.getDefaultStartDate();
        startDateInput.max = today;
        endDateInput.value = today;
        endDateInput.max = today;
    }

    getDefaultStartDate() {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Default to 30 days ago
        return date.toISOString().split('T')[0];
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Add category
        document.getElementById('add-category').addEventListener('click', () => {
            this.addCategory();
        });

        // Add spending
        document.getElementById('add-spending').addEventListener('click', () => {
            this.addTransaction();
        });

        // Chart controls
        document.getElementById('chart-category').addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('chart-grouping').addEventListener('change', () => {
            this.updateChart();
        });

        document.getElementById('chart-timeframe').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                document.getElementById('custom-range').style.display = 'block';
            } else {
                document.getElementById('custom-range').style.display = 'none';
                this.updateChart();
            }
        });

        // Apply custom date range
        document.getElementById('apply-date-range').addEventListener('click', () => {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                alert('Start date must be before end date');
                return;
            }
            
            this.customDateRange.startDate = startDate;
            this.customDateRange.endDate = endDate;
            this.updateChart();
        });

        // Search notes
        document.getElementById('search-notes').addEventListener('input', () => {
            this.loadTransactions();
        });

        // Filter by category
        document.getElementById('filter-category').addEventListener('change', () => {
            this.loadTransactions();
        });

        // Enter key support
        document.getElementById('category-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCategory();
        });

        document.getElementById('spending-amount').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTransaction();
        });

        document.getElementById('spending-note').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTransaction();
        });
    }

    setupModal() {
        const modal = document.getElementById('edit-modal');
        const closeBtn = document.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-edit');
        const saveBtn = document.getElementById('save-edit');

        closeBtn.onclick = () => modal.style.display = 'none';
        cancelBtn.onclick = () => modal.style.display = 'none';
        saveBtn.onclick = () => this.saveEditedTransaction();

        // Close modal when clicking outside
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    openEditModal(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        this.currentEditId = transactionId;
        
        // Populate edit form
        const editCategorySelect = document.getElementById('edit-category');
        editCategorySelect.innerHTML = '<option value="">Select Category</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.selected = category.id === transaction.categoryId;
            editCategorySelect.appendChild(option);
        });

        document.getElementById('edit-amount').value = transaction.amount;
        document.getElementById('edit-date').value = transaction.date;
        document.getElementById('edit-note').value = transaction.note || '';

        // Show modal
        document.getElementById('edit-modal').style.display = 'block';
    }

    saveEditedTransaction() {
        const transaction = this.transactions.find(t => t.id === this.currentEditId);
        if (!transaction) return;

        const newCategoryId = parseInt(document.getElementById('edit-category').value);
        const newAmount = parseFloat(document.getElementById('edit-amount').value);
        const newDate = document.getElementById('edit-date').value;
        const newNote = document.getElementById('edit-note').value.trim();

        if (!newCategoryId || isNaN(newAmount) || newAmount <= 0 || !newDate) {
            alert('Please fill in all required fields');
            return;
        }

        // Update transaction
        transaction.categoryId = newCategoryId;
        transaction.amount = newAmount;
        transaction.date = newDate;
        transaction.note = newNote;

        this.saveTransactions();
        this.loadTransactions();
        this.updateChart();
        
        // Close modal
        document.getElementById('edit-modal').style.display = 'none';
        this.currentEditId = null;
        
        this.showNotification('Transaction updated successfully!');
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Show active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        // Update chart and notes when switching to history tab
        if (tabName === 'history') {
            setTimeout(() => {
                this.updateChart();
                this.updateNotesSummary();
            }, 100);
        }
    }

    addCategory() {
        const nameInput = document.getElementById('category-name');
        const budgetInput = document.getElementById('category-budget');
        
        const name = nameInput.value.trim();
        const budget = parseFloat(budgetInput.value);

        if (!name || isNaN(budget) || budget <= 0) {
            alert('Please enter a valid category name and budget amount');
            return;
        }

        const category = {
            id: Date.now(),
            name,
            budget,
            color: this.getRandomColor()
        };

        this.categories.push(category);
        this.saveCategories();
        this.loadCategories();
        this.updateTotalBudget();
        
        // Clear inputs
        nameInput.value = '';
        budgetInput.value = '';
        nameInput.focus();
    }

    deleteCategory(id) {
        // Delete all transactions for this category first
        this.transactions = this.transactions.filter(t => t.categoryId !== id);
        this.saveTransactions();
        
        // Delete the category
        this.categories = this.categories.filter(cat => cat.id !== id);
        this.saveCategories();
        this.loadCategories();
        this.updateTotalBudget();
        this.loadTransactions();
    }

    addTransaction() {
        const categorySelect = document.getElementById('spending-category');
        const amountInput = document.getElementById('spending-amount');
        const dateInput = document.getElementById('spending-date');
        const noteInput = document.getElementById('spending-note');
        
        const categoryId = parseInt(categorySelect.value);
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        const note = noteInput.value.trim();

        if (!categoryId || isNaN(amount) || amount <= 0 || !date) {
            alert('Please select a category and enter a valid amount and date');
            return;
        }

        const transaction = {
            id: Date.now(),
            categoryId,
            amount,
            date,
            note,
            timestamp: new Date().getTime()
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        this.loadTransactions();
        
        // Clear inputs
        amountInput.value = '';
        noteInput.value = '';
        amountInput.focus();
        
        // Update notes summary if on history tab
        this.updateNotesSummary();
        
        // Show success message
        this.showNotification('Transaction added successfully!');
    }

    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveTransactions();
        this.loadTransactions();
        this.updateChart();
        this.updateNotesSummary();
    }

    saveCategories() {
        localStorage.setItem('budgetCategories', JSON.stringify(this.categories));
    }

    saveTransactions() {
        localStorage.setItem('budgetTransactions', JSON.stringify(this.transactions));
    }

    loadCategories() {
        const categoriesList = document.getElementById('categories-list');
        const categorySelect = document.getElementById('spending-category');
        const chartCategorySelect = document.getElementById('chart-category');
        const filterCategorySelect = document.getElementById('filter-category');
        
        // Clear existing options (except first)
        categoriesList.innerHTML = '';
        while (categorySelect.options.length > 1) categorySelect.remove(1);
        while (chartCategorySelect.options.length > 1) chartCategorySelect.remove(1);
        while (filterCategorySelect.options.length > 1) filterCategorySelect.remove(1);

        this.categories.forEach(category => {
            // Add to categories list
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';
            categoryDiv.innerHTML = `
                <div>
                    <strong>${category.name}</strong>
                    <div>Budget: $${category.budget.toFixed(2)}</div>
                </div>
                <button class="delete-btn" onclick="budgetTracker.deleteCategory(${category.id})">
                    Delete
                </button>
            `;
            categoriesList.appendChild(categoryDiv);

            // Add to category select for transactions
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);

            // Add to chart category select
            const chartOption = document.createElement('option');
            chartOption.value = category.id;
            chartOption.textContent = category.name;
            chartCategorySelect.appendChild(chartOption);

            // Add to filter category select
            const filterOption = document.createElement('option');
            filterOption.value = category.id;
            filterOption.textContent = category.name;
            filterCategorySelect.appendChild(filterOption);
        });
    }

    loadTransactions() {
        const transactionsList = document.getElementById('transactions-list');
        const budgetStatus = document.getElementById('budget-status');
        
        transactionsList.innerHTML = '';
        budgetStatus.innerHTML = '';

        // Get filter values
        const searchQuery = document.getElementById('search-notes').value.toLowerCase();
        const filterCategory = document.getElementById('filter-category').value;

        // Filter transactions
        let filteredTransactions = [...this.transactions];
        
        if (searchQuery) {
            filteredTransactions = filteredTransactions.filter(t => 
                t.note && t.note.toLowerCase().includes(searchQuery)
            );
        }
        
        if (filterCategory !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => 
                t.categoryId === parseInt(filterCategory)
            );
        }

        // Calculate spending per category
        const spendingByCategory = {};
        this.categories.forEach(cat => {
            const categorySpending = this.transactions
                .filter(t => t.categoryId === cat.id)
                .reduce((sum, t) => sum + t.amount, 0);
            spendingByCategory[cat.id] = categorySpending;
        });

        // Display budget status with progress bars
        this.categories.forEach(category => {
            const spent = spendingByCategory[category.id] || 0;
            const percentage = Math.min((spent / category.budget) * 100, 100);
            
            const statusDiv = document.createElement('div');
            statusDiv.className = 'budget-item';
            statusDiv.innerHTML = `
                <div>
                    <strong>${category.name}</strong>
                    <div>Budget: $${category.budget.toFixed(2)}</div>
                    <div>Spent: $${spent.toFixed(2)}</div>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div>
                    <div>Remaining: $${(category.budget - spent).toFixed(2)}</div>
                    <div style="color: ${percentage > 90 ? '#ff4757' : percentage > 70 ? '#ffa502' : '#2ed573'}">
                        ${percentage.toFixed(1)}% used
                    </div>
                </div>
            `;
            budgetStatus.appendChild(statusDiv);
        });

        // Display transactions
        const sortedTransactions = [...filteredTransactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedTransactions.length === 0) {
            transactionsList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #666; font-style: italic;">
                    ${searchQuery || filterCategory !== 'all' ? 'No matching transactions found' : 'No transactions yet'}
                </div>
            `;
            return;
        }

        sortedTransactions.forEach(transaction => {
            const category = this.categories.find(c => c.id === transaction.categoryId);
            const transactionDiv = document.createElement('div');
            transactionDiv.className = 'transaction-item';
            
            let noteHtml = '';
            if (transaction.note) {
                noteHtml = `
                    <div class="transaction-note">
                        📝 ${transaction.note}
                    </div>
                `;
            }
            
            transactionDiv.innerHTML = `
                <div style="flex: 1;">
                    <strong>${category ? category.name : 'Unknown'}</strong>
                    <div>${new Date(transaction.date).toLocaleDateString()}</div>
                    ${noteHtml}
                </div>
                <div class="transaction-actions">
                    <span style="color: #ff4757; font-weight: bold; margin-right: 15px;">
                        $${transaction.amount.toFixed(2)}
                    </span>
                    <button class="edit-btn" onclick="budgetTracker.openEditModal(${transaction.id})">
                        Edit
                    </button>
                    <button class="delete-btn" onclick="budgetTracker.deleteTransaction(${transaction.id})">
                        Delete
                    </button>
                </div>
            `;
            transactionsList.appendChild(transactionDiv);
        });
    }

    updateTotalBudget() {
        const total = this.categories.reduce((sum, cat) => sum + cat.budget, 0);
        document.getElementById('total-budget').textContent = total.toFixed(2);
    }

    updateNotesSummary() {
        const notesList = document.getElementById('notes-list');
        notesList.innerHTML = '';

        // Get transactions with notes
        const transactionsWithNotes = this.transactions
            .filter(t => t.note && t.note.trim() !== '')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Show last 10 notes

        if (transactionsWithNotes.length === 0) {
            notesList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
                    No notes yet. Add notes to your transactions!
                </div>
            `;
            return;
        }

        transactionsWithNotes.forEach(transaction => {
            const category = this.categories.find(c => c.id === transaction.categoryId);
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';
            noteDiv.innerHTML = `
                <div>
                    <span class="note-category">${category ? category.name : 'Unknown'}</span>
                    <span class="note-amount">$${transaction.amount.toFixed(2)}</span>
                </div>
                <div class="note-date">${new Date(transaction.date).toLocaleDateString()}</div>
                <div class="note-text">${transaction.note}</div>
            `;
            notesList.appendChild(noteDiv);
        });
    }

    // New helper methods for date grouping
    getDateKey(date, grouping) {
        const d = new Date(date);
        
        switch (grouping) {
            case 'day':
                return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
            case 'week':
                // Get start of week (Monday)
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const weekStart = new Date(d.setDate(diff));
                return `Week of ${weekStart.toLocaleDateString('en-CA')}`;
            case 'month':
                return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            case 'year':
                return d.getFullYear().toString();
            default:
                return d.toLocaleDateString();
        }
    }

    getFilteredTransactions() {
        const categoryFilter = document.getElementById('chart-category').value;
        const timeframeFilter = document.getElementById('chart-timeframe').value;
        
        let filteredTransactions = [...this.transactions];
        
        // Apply category filter
        if (categoryFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => 
                t.categoryId === parseInt(categoryFilter)
            );
        }
        
        // Apply timeframe filter
        const now = new Date();
        let startDate;
        
        if (timeframeFilter === 'custom' && this.customDateRange.startDate) {
            startDate = new Date(this.customDateRange.startDate);
            const endDate = new Date(this.customDateRange.endDate);
            
            filteredTransactions = filteredTransactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            });
        } else {
            switch (timeframeFilter) {
                case '7days':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case '30days':
                    startDate = new Date(now.setDate(now.getDate() - 30));
                    break;
                case '3months':
                    startDate = new Date(now.setMonth(now.getMonth() - 3));
                    break;
                case '6months':
                    startDate = new Date(now.setMonth(now.getMonth() - 6));
                    break;
                case '1year':
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    startDate = null;
            }
            
            if (startDate) {
                filteredTransactions = filteredTransactions.filter(t => 
                    new Date(t.date) >= startDate
                );
            }
        }
        
        return filteredTransactions;
    }

    setupChart() {
        const ctx = document.getElementById('spendingChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += '$' + context.parsed.y.toFixed(2);
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });
    }

    updateChart() {
        const grouping = document.getElementById('chart-grouping').value;
        const filteredTransactions = this.getFilteredTransactions();
        
        if (filteredTransactions.length === 0) {
            this.displayNoData();
            return;
        }
        
        // Group data by period and category
        const groupedData = {};
        const periodTotals = {};
        const periodTransactionCounts = {};
        
        filteredTransactions.forEach(transaction => {
            const periodKey = this.getDateKey(transaction.date, grouping);
            const category = this.categories.find(c => c.id === transaction.categoryId);
            const categoryName = category ? category.name : 'Unknown';
            
            // Initialize period data if not exists
            if (!groupedData[periodKey]) {
                groupedData[periodKey] = {};
                periodTotals[periodKey] = 0;
                periodTransactionCounts[periodKey] = {};
            }
            
            if (!groupedData[periodKey][categoryName]) {
                groupedData[periodKey][categoryName] = 0;
            }
            
            if (!periodTransactionCounts[periodKey][categoryName]) {
                periodTransactionCounts[periodKey][categoryName] = 0;
            }
            
            // Add amount
            groupedData[periodKey][categoryName] += transaction.amount;
            periodTotals[periodKey] += transaction.amount;
            periodTransactionCounts[periodKey][categoryName] += 1;
        });
        
        // Sort periods chronologically
        const periods = Object.keys(groupedData).sort((a, b) => {
            if (grouping === 'week') {
                return new Date(a.split(' of ')[1]) - new Date(b.split(' of ')[1]);
            } else if (grouping === 'month') {
                return new Date(a) - new Date(b);
            } else if (grouping === 'year') {
                return parseInt(a) - parseInt(b);
            } else {
                return new Date(a) - new Date(b);
            }
        });
        
        // Get all unique categories in the filtered data
        const allCategories = [...new Set(filteredTransactions.map(t => {
            const cat = this.categories.find(c => c.id === t.categoryId);
            return cat ? cat.name : 'Unknown';
        }))];
        
        // Prepare datasets for chart
        const datasets = allCategories.map(categoryName => {
            const category = this.categories.find(c => c.name === categoryName);
            const data = periods.map(period => groupedData[period][categoryName] || 0);
            
            return {
                label: categoryName,
                data: data,
                borderColor: category ? category.color : this.getRandomColor(),
                backgroundColor: category ? this.hexToRgba(category.color, 0.1) : 'rgba(0,0,0,0.1)',
                borderWidth: 3,
                tension: 0.1,
                fill: true,
                stack: grouping === 'day' ? 'stack' : undefined // Stack only for daily view
            };
        });
        
        // Update chart
        this.chart.data.labels = periods;
        this.chart.data.datasets = datasets;
        this.chart.update();
        
        // Update summary stats
        this.updateSummaryStats(periods, periodTotals);
        
        // Update data table
        this.updateDataTable(periods, groupedData, periodTransactionCounts, grouping);
        
        // Update notes summary
        this.updateNotesSummary();
    }

    updateSummaryStats(periods, periodTotals) {
        const totalShown = Object.values(periodTotals).reduce((sum, val) => sum + val, 0);
        const averagePeriod = periods.length > 0 ? totalShown / periods.length : 0;
        const highestPeriod = Math.max(...Object.values(periodTotals));
        
        document.getElementById('total-shown').textContent = `$${totalShown.toFixed(2)}`;
        document.getElementById('average-period').textContent = `$${averagePeriod.toFixed(2)}`;
        document.getElementById('highest-period').textContent = `$${highestPeriod.toFixed(2)}`;
        document.getElementById('periods-count').textContent = periods.length;
    }

    updateDataTable(periods, groupedData, transactionCounts, grouping) {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';
        
        let totalAllPeriods = 0;
        let rowCount = 0;
        
        periods.forEach(period => {
            const periodTotal = Object.values(groupedData[period]).reduce((sum, val) => sum + val, 0);
            totalAllPeriods += periodTotal;
            
            Object.keys(groupedData[period]).forEach(categoryName => {
                const amount = groupedData[period][categoryName];
                const count = transactionCounts[period][categoryName];
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${period}</td>
                    <td>${categoryName}</td>
                    <td><strong>$${amount.toFixed(2)}</strong></td>
                    <td><span class="transaction-count">${count}</span></td>
                `;
                tableBody.appendChild(row);
                rowCount++;
            });
            
            // Add period total row
            if (Object.keys(groupedData[period]).length > 1) {
                const totalRow = document.createElement('tr');
                totalRow.style.backgroundColor = '#f8f9fa';
                totalRow.style.fontWeight = 'bold';
                totalRow.innerHTML = `
                    <td colspan="2"><em>${period} Total</em></td>
                    <td>$${periodTotal.toFixed(2)}</td>
                    <td></td>
                `;
                tableBody.appendChild(totalRow);
                rowCount++;
            }
        });
        
        // Add grand total row if multiple rows
        if (rowCount > 1) {
            const grandTotalRow = document.createElement('tr');
            grandTotalRow.style.backgroundColor = '#e3f2fd';
            grandTotalRow.style.fontWeight = 'bold';
            grandTotalRow.style.fontSize = '1.1em';
            grandTotalRow.innerHTML = `
                <td colspan="2">Grand Total (${periods.length} ${grouping}${periods.length > 1 ? 's' : ''})</td>
                <td>$${totalAllPeriods.toFixed(2)}</td>
                <td></td>
            `;
            tableBody.appendChild(grandTotalRow);
        }
    }

    displayNoData() {
        this.chart.data.labels = [];
        this.chart.data.datasets = [];
        this.chart.update();
        
        document.getElementById('total-shown').textContent = '$0.00';
        document.getElementById('average-period').textContent = '$0.00';
        document.getElementById('highest-period').textContent = '$0.00';
        document.getElementById('periods-count').textContent = '0';
        
        document.getElementById('table-body').innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #666; font-style: italic;">
                    No transactions found for the selected filters.
                    <br>
                    <small>Add some transactions first!</small>
                </td>
            </tr>
        `;
    }

    getRandomColor() {
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#fa709a', '#fee140', '#30cfd0', '#330867'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4cd964 0%, #5ac8fa 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }
}

// Initialize the app when the page loads
let budgetTracker;
document.addEventListener('DOMContentLoaded', () => {
    budgetTracker = new BudgetTracker();
});