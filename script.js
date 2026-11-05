
let books = JSON.parse(localStorage.getItem("libraryBooks")) || [];
let loans = JSON.parse(localStorage.getItem("libraryLoans")) || [];
let transactions = JSON.parse(localStorage.getItem("libraryTransactions")) || [];

function saveData() {
    localStorage.setItem("libraryBooks", JSON.stringify(books));
    localStorage.setItem("libraryLoans", JSON.stringify(loans));
    localStorage.setItem("libraryTransactions", JSON.stringify(transactions));
}

function generateId() {
    return Date.now().toString() + Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// 2. INITIALIZE WEBSITE

document.addEventListener("DOMContentLoaded", function () {

    const main = document.querySelector("main");
    const addBookPanel = document.getElementById("addBookPanel");
    const addBookForm = document.getElementById("addBookForm");

    if (!main || !addBookPanel || !addBookForm) {
        console.error("Check your HTML IDs. Required elements are missing.");
        return;
    }

    // Create additional website sections

    main.insertAdjacentHTML("beforeend", `

        <!-- DASHBOARD -->
        <section id="dashboardPanel" class="form-section">
            <h3>Library Overview</h3>
            <div id="dashboardActivity"></div>
        </section>

        <!-- BOOK INVENTORY -->
        <section id="inventoryPanel" class="form-section" hidden>
            <h3>Book Inventory</h3>

            <input type="search" id="bookSearch"
                placeholder="Search by title, author, or ISBN...">

            <div style="overflow-x:auto; margin-top:20px;">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Author</th>
                            <th>ISBN</th>
                            <th>Year</th>
                            <th>Available</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventoryBody"></tbody>
                </table>
            </div>
        </section>

        <!-- BORROW AND RETURN -->
        <section id="borrowPanel" class="form-section" hidden>

            <h3>Borrow a Book</h3>

            <form id="borrowForm">

                <div class="form-group">
                    <label for="borrowerName">Borrower's Name</label>
                    <input type="text" id="borrowerName"
                        required placeholder="Enter full name">
                </div>

                <div class="form-group" style="margin-top:15px;">
                    <label for="borrowBook">Select Book</label>
                    <select id="borrowBook" required>
                        <option value="">Select a book</option>
                    </select>
                </div>

                <div class="form-group" style="margin-top:15px;">
                    <label for="borrowQuantity">Quantity</label>
                    <input type="number" id="borrowQuantity"
                        min="1" value="1" required>
                </div>

                <button type="submit" class="btn-submit"
                    style="margin-top:20px;">
                    Confirm Borrowing
                </button>

            </form>

            <hr style="margin:30px 0;">

            <h3>Return a Book</h3>

            <form id="returnForm">

                <div class="form-group">
                    <label for="returnLoan">Select Active Borrowing</label>
                    <select id="returnLoan" required>
                        <option value="">Select borrowing record</option>
                    </select>
                </div>

                <div class="form-group" style="margin-top:15px;">
                    <label for="returnQuantity">Quantity to Return</label>
                    <input type="number" id="returnQuantity"
                        min="1" value="1" required>
                </div>

                <button type="submit" class="btn-submit"
                    style="margin-top:20px;">
                    Confirm Return
                </button>

            </form>

        </section>

        <!-- TRANSACTION HISTORY -->
        <section id="historyPanel" class="form-section" hidden>

            <div style="display:flex; justify-content:space-between;
                align-items:center; gap:15px; flex-wrap:wrap;">

                <h3>Transaction History</h3>

                <button type="button" id="clearHistory"
                    style="background:#dc3545;color:white;
                    border:none;padding:10px 15px;
                    border-radius:6px;cursor:pointer;">
                    Clear All History
                </button>

            </div>

            <div style="overflow-x:auto; margin-top:20px;">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Borrower</th>
                            <th>Book</th>
                            <th>Quantity</th>
                            <th>Action</th>
                            <th>Manage</th>
                        </tr>
                    </thead>
                    <tbody id="historyBody"></tbody>
                </table>
            </div>

        </section>

    `);

    // 3. NAVIGATION

    const panels = {
        dashboard: document.getElementById("dashboardPanel"),
        inventory: document.getElementById("inventoryPanel"),
        add: addBookPanel,
        borrow: document.getElementById("borrowPanel"),
        history: document.getElementById("historyPanel")
    };

    const headerTitle = document.querySelector(".header-title h1");
    const headerDescription = document.querySelector(".header-title p");

    function showView(view) {

        if (!panels[view]) return;

        Object.values(panels).forEach(panel => {
            panel.hidden = true;
        });

        panels[view].hidden = false;

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        const activeLink = document.querySelector(
            `[data-view="${view}"]`
        );

        if (activeLink) {
            activeLink.closest(".nav-item").classList.add("active");
        }

        const titles = {
            dashboard: ["Dashboard", "Manage your library collection in one place."],
            inventory: ["Book Inventory", "View, search, edit, and manage your books."],
            add: ["Add New Book", "Register a new book in your collection."],
            borrow: ["Borrow & Return", "Manage borrowing and returning transactions."],
            history: ["Transaction History", "Review all recorded transactions."]
        };

        headerTitle.textContent = titles[view][0];
        headerDescription.textContent = titles[view][1];

        document.getElementById("addBookBtn").style.display =
            view === "add" ? "none" : "inline-block";

        refreshAll();
    }

    document.querySelectorAll("[data-view]").forEach(link => {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            showView(this.dataset.view);
        });
    });

    document.getElementById("addBookBtn").addEventListener("click", () => {
        showView("add");
    });

    // 4. ADD BOOK

    addBookForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const title = document.getElementById("title").value.trim();
        const author = document.getElementById("author").value.trim();
        const isbn = document.getElementById("isbn").value.trim();
        const year = Number(document.getElementById("publicationYear").value);
        const copies = Number(document.getElementById("availableCopies").value);

        if (!title || !author || !isbn ||
            !Number.isInteger(year) ||
            !Number.isInteger(copies) ||
            year < 1 || year > new Date().getFullYear() ||
            copies < 0) {

            alert("Please enter valid book information.");
            return;
        }

        const duplicate = books.some(book =>
            book.isbn.toLowerCase() === isbn.toLowerCase()
        );

        if (duplicate) {
            alert("This ISBN already exists.");
            return;
        }

        books.push({
            id: generateId(),
            title,
            author,
            isbn,
            year,
            totalCopies: copies,
            availableCopies: copies
        });

        saveData();
        addBookForm.reset();

        alert("Book successfully added!");

        showView("inventory");
    });

    // 5. BOOK INVENTORY

    function renderInventory(search = "") {

        const tbody = document.getElementById("inventoryBody");

        const filteredBooks = books.filter(book => {

            const text = (
                book.title + " " +
                book.author + " " +
                book.isbn
            ).toLowerCase();

            return text.includes(search.toLowerCase());
        });

        tbody.innerHTML = "";

        if (filteredBooks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:20px;">
                        No books found.
                    </td>
                </tr>
            `;
            return;
        }

        filteredBooks.forEach(book => {

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${escapeHTML(book.title)}</td>
                    <td>${escapeHTML(book.author)}</td>
                    <td>${escapeHTML(book.isbn)}</td>
                    <td>${book.year}</td>
                    <td>${book.availableCopies} / ${book.totalCopies}</td>
                    <td>
                        <button data-edit="${book.id}">Edit</button>

                        <button data-delete-book="${book.id}"
                            style="background:#dc3545;color:white;
                            border:none;padding:6px;border-radius:4px;">
                            Delete
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    document.getElementById("bookSearch").addEventListener(
        "input", function () {
            renderInventory(this.value);
        }
    );

    // 6. EDIT AND DELETE BOOK

    document.getElementById("inventoryBody").addEventListener(
        "click", function (event) {

            const editId = event.target.dataset.edit;
            const deleteId = event.target.dataset.deleteBook;

            if (editId) {

                const book = books.find(b => b.id === editId);
                if (!book) return;

                const title = prompt("Book Title:", book.title);
                if (title === null) return;

                const author = prompt("Author:", book.author);
                if (author === null) return;

                const isbn = prompt("ISBN:", book.isbn);
                if (isbn === null) return;

                const yearInput = prompt("Publication Year:", book.year);
                if (yearInput === null) return;

                const totalInput = prompt("Total Copies:", book.totalCopies);
                if (totalInput === null) return;

                const year = Number(yearInput);
                const total = Number(totalInput);

                const borrowed = book.totalCopies - book.availableCopies;

                if (!title.trim() || !author.trim() || !isbn.trim() ||
                    !Number.isInteger(year) || year < 1 ||
                    year > new Date().getFullYear() ||
                    !Number.isInteger(total) || total < borrowed) {

                    alert("Invalid information. Total copies cannot be less than the number currently borrowed.");
                    return;
                }

                const duplicate = books.some(b =>
                    b.id !== book.id &&
                    b.isbn.toLowerCase() === isbn.trim().toLowerCase()
                );

                if (duplicate) {
                    alert("Another book already uses this ISBN.");
                    return;
                }

                book.title = title.trim();
                book.author = author.trim();
                book.isbn = isbn.trim();
                book.year = year;
                book.totalCopies = total;
                book.availableCopies = total - borrowed;

                saveData();
                refreshAll();

                alert("Book updated successfully!");
            }

            if (deleteId) {

                const book = books.find(b => b.id === deleteId);
                if (!book) return;

                const hasActiveLoan = loans.some(
                    loan => loan.bookId === deleteId && loan.quantity > 0
                );

                if (hasActiveLoan) {
                    alert("Cannot delete a book with active borrowings.");
                    return;
                }

                if (!confirm(`Delete "${book.title}"?`)) return;

                books = books.filter(b => b.id !== deleteId);

                saveData();
                refreshAll();

                alert("Book deleted successfully!");
            }
        }
    );

    // 7. BORROW BOOK

    function renderBorrowOptions() {

        const borrowSelect = document.getElementById("borrowBook");

        borrowSelect.innerHTML = `<option value="">Select a book</option>`;

        books.filter(book => book.availableCopies > 0)
            .forEach(book => {

                borrowSelect.insertAdjacentHTML("beforeend", `
                    <option value="${book.id}">
                        ${escapeHTML(book.title)}
                        (${book.availableCopies} available)
                    </option>
                `);
            });

        const returnSelect = document.getElementById("returnLoan");

        returnSelect.innerHTML =
            `<option value="">Select active borrowing</option>`;

        loans.filter(loan => loan.quantity > 0)
            .forEach(loan => {

                const book = books.find(b => b.id === loan.bookId);
                if (!book) return;

                returnSelect.insertAdjacentHTML("beforeend", `
                    <option value="${loan.id}">
                        ${escapeHTML(loan.borrower)} -
                        ${escapeHTML(book.title)} -
                        ${loan.quantity} borrowed
                    </option>
                `);
            });
    }

    document.getElementById("borrowForm").addEventListener(
        "submit", function (event) {

            event.preventDefault();

            const borrower = document.getElementById(
                "borrowerName"
            ).value.trim();

            const bookId = document.getElementById("borrowBook").value;

            const quantity = Number(
                document.getElementById("borrowQuantity").value
            );

            const book = books.find(b => b.id === bookId);

            if (!borrower || !book ||
                !Number.isInteger(quantity) || quantity < 1) {

                alert("Please enter valid borrowing information.");
                return;
            }

            if (quantity > book.availableCopies) {
                alert("Not enough available copies!");
                return;
            }

            book.availableCopies -= quantity;

            const loan = {
                id: generateId(),
                bookId: book.id,
                borrower,
                quantity,
                borrowedDate: new Date().toISOString()
            };

            loans.push(loan);

            transactions.push({
                id: generateId(),
                loanId: loan.id,
                bookTitle: book.title,
                borrower,
                quantity,
                action: "Borrowed",
                date: new Date().toISOString()
            });

            saveData();

            this.reset();
            refreshAll();

            alert("Book successfully borrowed!");
        }
    );

    // 8. RETURN BOOK

    document.getElementById("returnForm").addEventListener(
        "submit", function (event) {

            event.preventDefault();

            const loanId = document.getElementById("returnLoan").value;

            const quantity = Number(
                document.getElementById("returnQuantity").value
            );

            const loan = loans.find(l => l.id === loanId);

            if (!loan || !Number.isInteger(quantity) || quantity < 1) {
                alert("Please select a valid borrowing record.");
                return;
            }

            if (quantity > loan.quantity) {
                alert("Return quantity exceeds borrowed quantity.");
                return;
            }

            const book = books.find(b => b.id === loan.bookId);

            if (!book) {
                alert("Book record not found.");
                return;
            }

            book.availableCopies += quantity;
            loan.quantity -= quantity;

            transactions.push({
                id: generateId(),
                loanId: loan.id,
                bookTitle: book.title,
                borrower: loan.borrower,
                quantity,
                action: "Returned",
                date: new Date().toISOString()
            });

            saveData();

            this.reset();
            refreshAll();

            alert("Book successfully returned!");
        }
    );

    // 9. TRANSACTION HISTORY

    function renderHistory() {

        const tbody = document.getElementById("historyBody");

        tbody.innerHTML = "";

        const sorted = [...transactions].reverse();

        if (sorted.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:20px;">
                        No transaction records available.
                    </td>
                </tr>
            `;
            return;
        }

        sorted.forEach(transaction => {

            const date = new Date(transaction.date).toLocaleString();

            const color = transaction.action === "Borrowed"
                ? "#e67e22" : "#2e7d32";

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${escapeHTML(date)}</td>
                    <td>${escapeHTML(transaction.borrower)}</td>
                    <td>${escapeHTML(transaction.bookTitle)}</td>
                    <td>${transaction.quantity}</td>
                    <td style="color:${color};font-weight:600;">
                        ${transaction.action}
                    </td>
                    <td>
                        <button data-delete-history="${transaction.id}"
                            style="background:#dc3545;color:white;
                            border:none;padding:7px 10px;
                            border-radius:4px;cursor:pointer;">
                            Delete
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    // DELETE ONE HISTORY RECORD

    document.getElementById("historyBody").addEventListener(
        "click", function (event) {

            const id = event.target.dataset.deleteHistory;
            if (!id) return;

            if (!confirm("Delete this transaction record?")) return;

            transactions = transactions.filter(t => t.id !== id);

            // Deleting history does not change inventory or active loans.

            saveData();
            renderHistory();

            alert("Transaction deleted.");
        }
    );

    // CLEAR ALL HISTORY

    document.getElementById("clearHistory").addEventListener(
        "click", function () {

            if (transactions.length === 0) {
                alert("No transaction history to clear.");
                return;
            }

            if (!confirm(
                "Are you sure you want to permanently clear ALL history?"
            )) return;

            transactions = [];

            // Active loans and inventory quantities remain unchanged.

            saveData();
            renderHistory();

            alert("All transaction history cleared.");
        }
    );

    // 10. DASHBOARD METRICS

    function updateDashboard() {

        const totalTitles = books.length;

        const totalAvailable = books.reduce(
            (sum, book) => sum + book.availableCopies, 0
        );

        const totalBorrowed = books.reduce(
            (sum, book) =>
                sum + book.totalCopies - book.availableCopies, 0
        );

        document.getElementById("totalBooks").textContent = totalTitles;

        document.getElementById("searchResults").textContent =
            totalAvailable;

        let extraMetrics = document.getElementById("extraMetrics");

        if (!extraMetrics) {

            extraMetrics = document.createElement("div");
            extraMetrics.id = "extraMetrics";
            extraMetrics.className = "metrics-grid";

            document.querySelector(".metrics-grid")
                .insertAdjacentElement("afterend", extraMetrics);
        }

        extraMetrics.innerHTML = `
            <div class="card">
                <p class="card-label">Available Copies</p>
                <p class="card-value">${totalAvailable}</p>
            </div>

            <div class="card">
                <p class="card-label">Currently Borrowed</p>
                <p class="card-value">${totalBorrowed}</p>
            </div>

            <div class="card">
                <p class="card-label">Total Transactions</p>
                <p class="card-value">${transactions.length}</p>
            </div>
        `;

        const activity = document.getElementById("dashboardActivity");

        const recent = [...transactions].reverse().slice(0, 5);

        activity.innerHTML = `
            <h4 style="margin:25px 0 15px;">Recent Transactions</h4>

            ${
                recent.length
                ? recent.map(t => `
                    <p style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
                        <strong>${escapeHTML(t.borrower)}</strong>
                        ${t.action.toLowerCase()}
                        <strong>${escapeHTML(t.bookTitle)}</strong>
                        (${t.quantity} copies)
                    </p>
                `).join("")
                : "<p>No recent transactions.</p>"
            }
        `;
    }

    // 11. REFRESH ALL COMPONENTS

    function refreshAll() {

        updateDashboard();

        renderInventory(
            document.getElementById("bookSearch")?.value || ""
        );

        renderBorrowOptions();

        renderHistory();
    }

    // 12. START THE SYSTEM

    addBookPanel.hidden = true;

    showView("dashboard");

});
