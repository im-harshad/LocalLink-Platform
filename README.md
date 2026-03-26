# 🌟 LocalLink Platform

LocalLink is a modern, feature-rich web platform connecting customers with local service professionals. The platform allows users to discover services, book time slots in real-time, process payments, and earn loyalty points.

![LocalLink Platform Preview](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)

---

## ✨ Key Features

1. **🗓️ Availability Calendar & Smart Booking**
   - Interactive calendar for providers to set up free slots.
   - Customers can view and select real-time open slots efficiently.

2. **💳 Seamless Payments Checkout**
   - Secure and simulated dummy payment gateway.
   - Supports validation, multiple payment methods (Wallet, UPI, Card), and real-time processing overlay. 

3. **🔔 Real-time Socket.io Notifications**
   - Live push notifications without refreshing the page.
   - Get immediate bells and toast alerts on successful bookings and payment confirmations.

4. **💎 Loyalty & Rewards System**
   - Earn points on every successful booking.
   - Tier progression (Bronze -> Platinum) based on lifetime spending.
   - Redeem points as discounts on future bookings.

5. **🕒 Instant Virtual Queue & Tracking**
   - Every booking generates a real-time virtual queue token so you know your turn.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Bootstrap 5, Vanilla JavaScript, SweetAlert2
- **Backend:** Node.js, Express.js
- **Database:** MySQL (mysql2)
- **Real-time Engine:** Socket.io
- **Security & Auth:** JSON Web Tokens (JWT), bcryptjs, Helmet, Express Rate Limit

---

## 🚀 How to Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed
- [MySQL](https://www.mysql.com/) installed and running locally

### 2. Setup Database
1. Create a MySQL database (e.g., `locallink`).
2. Run the `database/locallink.sql` backup if available, or the migration scripts.
3. Apply latest features via `node database/migrate_new_features.js`.
4. Run sample seed data via `node database/final_seed.js`.

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=locallink
JWT_SECRET=your_super_secret_jwt_key
```

### 5. Start the Server
```bash
npm start
```
*The server will start on `http://localhost:5000`*

---

## 👨‍💻 Project Structure

```text
/locallink
|-- /config        # Database configurations
|-- /controllers   # Logic for auth, bookings, payments, loyalty
|-- /database      # Schema creations, migrations, and seeders
|-- /middleware    # JWT validation, Admin checks
|-- /models        # Database query abstractions
|-- /public        # Static assets (JS interactions, CSS styling)
|-- /routes        # API route definitions
|-- /views         # HTML templates for dashboards, profiles, etc.
|-- server.js      # Main Express / Socket.io App Entry Point
```

---

<p align="center">Made with ❤️ for connecting local talent to local needs.</p>
