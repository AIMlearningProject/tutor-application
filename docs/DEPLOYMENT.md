# Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- Node.js 18.x or higher
- MongoDB 7.x
- Docker & Docker Compose (for containerized deployment)
- Google Cloud Console account (for OAuth)
- Gmail account with App Password (for email notifications)

## Local Development

### 1. Clone and Install

```bash
git clone <repository-url>
cd tutor-application
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGO_URI in .env
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 5. Seed Database (Optional)

```bash
npm run seed
```

### 6. Run Application

```bash
npm start
# Application runs on http://localhost:3000
```

### 7. Run Tests

```bash
npm test              # All tests with coverage
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
```

### 8. Linting & Formatting

```bash
npm run lint          # Auto-fix linting issues
npm run lint:check    # Check linting without fixing
npm run format        # Format code with Prettier
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build images
npm run docker:build

# Start containers
npm run docker:up

# View logs
npm run docker:logs

# Stop containers
npm run docker:down
```

### Manual Docker Build

```bash
# Build image
docker build -t tutor-application:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  --name tutor-app \
  --env-file .env \
  tutor-application:latest
```

### Docker Compose Stack

The `docker-compose.yml` includes:

- Application container (Node.js)
- MongoDB container
- Persistent volumes for data
- Health checks
- Automatic restart policies

## Cloud Deployment

### Railway Deployment

1. **Install Railway CLI**

```bash
npm install -g @railway/cli
```

2. **Login and Initialize**

```bash
railway login
railway init
```

3. **Add MongoDB**

```bash
railway add mongodb
```

4. **Set Environment Variables**

```bash
railway variables set SESSION_SECRET="your-secret-key"
railway variables set GOOGLE_CLIENT_ID="your-client-id"
railway variables set GOOGLE_CLIENT_SECRET="your-client-secret"
# ... set all required variables
```

5. **Deploy**

```bash
railway up
```

6. **Get Deployment URL**

```bash
railway open
```

### Render Deployment

1. **Create New Web Service**
   - Connect GitHub repository
   - Select `tutor-application`

2. **Configure Build Settings**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Node Version: 18

3. **Add MongoDB**
   - Use Render's MongoDB or connect to MongoDB Atlas

4. **Set Environment Variables**
   - Add all variables from `.env.example`
   - Update `GOOGLE_CALLBACK_URL` with your Render URL

5. **Deploy**
   - Render will auto-deploy on git push

### AWS EC2 Deployment

1. **Launch EC2 Instance**

```bash
# Amazon Linux 2 or Ubuntu 22.04
# t2.small or larger recommended
```

2. **Install Dependencies**

```bash
# Update system
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # Amazon Linux
# or
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs  # Ubuntu

# Install PM2
sudo npm install -g pm2

# Install MongoDB or use MongoDB Atlas
```

3. **Deploy Application**

```bash
# Clone repository
git clone <repo-url>
cd tutor-application
npm install

# Set up environment
cp .env.example .env
nano .env  # Edit with production values

# Start with PM2
pm2 start src/app.js --name tutor-app
pm2 save
pm2 startup
```

4. **Configure Nginx Reverse Proxy**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

5. **SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Heroku Deployment

1. **Install Heroku CLI**

```bash
npm install -g heroku
heroku login
```

2. **Create Heroku App**

```bash
heroku create tutor-application
```

3. **Add MongoDB**

```bash
heroku addons:create mongolab:sandbox
```

4. **Set Environment Variables**

```bash
heroku config:set SESSION_SECRET="your-secret"
heroku config:set GOOGLE_CLIENT_ID="your-client-id"
# ... set all variables
```

5. **Deploy**

```bash
git push heroku main
heroku open
```

## Environment Configuration

### Required Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3000

# Session
SESSION_SECRET=<strong-random-string-min-32-chars>

# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/tutor_app

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_NOTIFICATION_EMAIL=notifications@yourdomain.com

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=<gmail-app-password>

# Application
BASE_URL=https://your-domain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

### Generating Secure SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Creating Gmail App Password

1. Go to Google Account Settings
2. Security → 2-Step Verification (enable if not enabled)
3. App Passwords
4. Select "Mail" and "Other (Custom name)"
5. Generate and copy the 16-character password
6. Use this in EMAIL_PASS environment variable

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create free cluster

2. **Configure Database**
   - Create database: `tutor_application`
   - Create user with read/write permissions
   - Whitelist IP addresses (or 0.0.0.0/0 for all)

3. **Get Connection String**

   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/tutor_application?retryWrites=true&w=majority
   ```

4. **Update .env**
   ```bash
   MONGO_URI=<your-connection-string>
   ```

### Local MongoDB

1. **Install MongoDB**

```bash
# macOS
brew install mongodb-community@7.0

# Ubuntu
sudo apt-get install -y mongodb-org

# Windows - Download from mongodb.com
```

2. **Start MongoDB**

```bash
# macOS/Linux
mongod --dbpath /data/db

# Windows
mongod.exe --dbpath C:\data\db
```

3. **Connection String**

```bash
MONGO_URI=mongodb://localhost:27017/tutor_application
```

## Monitoring & Maintenance

### Health Checks

The application exposes a health check endpoint:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "uptime": 12345,
  "message": "OK",
  "timestamp": 1234567890,
  "database": "connected"
}
```

### Log Management

Logs are stored in `./logs/` directory:

- `application-YYYY-MM-DD.log` - General application logs
- `error-YYYY-MM-DD.log` - Error logs only
- `exceptions-YYYY-MM-DD.log` - Unhandled exceptions
- `rejections-YYYY-MM-DD.log` - Unhandled promise rejections

**Log Rotation**: Logs are automatically rotated daily and compressed.

**Retention**:

- Application logs: 14 days
- Error logs: 30 days

### Viewing Logs

```bash
# Latest application log
tail -f logs/application-$(date +%Y-%m-%d).log

# Latest error log
tail -f logs/error-$(date +%Y-%m-%d).log

# Docker logs
docker logs -f tutor-application

# PM2 logs
pm2 logs tutor-app
```

### Database Backup

#### MongoDB Atlas

- Automatic backups enabled by default
- Point-in-time recovery available
- Download backups from Atlas dashboard

#### Local MongoDB

```bash
# Backup
mongodump --db tutor_application --out ./backups/$(date +%Y%m%d)

# Restore
mongorestore --db tutor_application ./backups/20240115/tutor_application
```

### Performance Monitoring

1. **Application Metrics**

```bash
# Check health endpoint
curl http://localhost:3000/health

# Monitor response times in logs
grep "HTTP Request" logs/application-*.log
```

2. **Database Monitoring**
   - Use MongoDB Atlas monitoring dashboard
   - Check slow queries in logs
   - Monitor connection pool usage

3. **Resource Usage**

```bash
# Docker stats
docker stats tutor-application

# PM2 monitoring
pm2 monit
```

### Scaling

#### Horizontal Scaling

1. **Setup Load Balancer** (Nginx example)

```nginx
upstream tutor_app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://tutor_app;
    }
}
```

2. **Session Storage**
   - Move sessions to Redis for multi-instance support
   - Install: `npm install connect-redis redis`

3. **Database**
   - Use MongoDB replica set
   - Configure read preference for read operations

#### Vertical Scaling

- Increase server resources (CPU, RAM)
- Recommended: 2 CPU, 4GB RAM for 1000 concurrent users

### Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] SESSION_SECRET is strong and random
- [ ] Environment variables not in code
- [ ] Database credentials secured
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled (Helmet)
- [ ] Input validation active
- [ ] Admin email configured correctly
- [ ] Logs don't contain sensitive data
- [ ] Regular security updates (npm audit)

### Troubleshooting

#### Application Won't Start

```bash
# Check logs
tail -f logs/error-*.log

# Verify environment variables
node -e "require('dotenv').config(); console.log(process.env)"

# Check MongoDB connection
mongosh <MONGO_URI>
```

#### Google OAuth Issues

- Verify redirect URI matches exactly
- Check CLIENT_ID and CLIENT_SECRET
- Ensure domain is authorized in Google Console

#### Email Not Sending

- Verify Gmail App Password (not regular password)
- Check EMAIL_USER and EMAIL_PASS
- Ensure less secure apps enabled or App Password used

#### Database Connection Issues

- Verify MONGO_URI format
- Check IP whitelist in MongoDB Atlas
- Test connection with mongosh

### Maintenance Tasks

#### Daily

- Monitor error logs
- Check application health endpoint
- Verify email notifications working

#### Weekly

- Review application logs for anomalies
- Check disk space usage
- Monitor response times

#### Monthly

- Database backup verification
- Security updates: `npm audit fix`
- Review and clean old logs
- Performance analysis

#### Quarterly

- Dependency updates
- Security audit
- Capacity planning review
- Disaster recovery test

## CI/CD Pipeline

The project includes GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

- **On Push/PR**:
  - Lint code
  - Run tests
  - Build Docker image
  - Security scan

- **On Main Branch**:
  - Deploy to production (configure your platform)

To enable:

1. Add secrets in GitHub repository settings
2. Configure deployment platform credentials
3. Update workflow file with platform-specific commands

## Support & Documentation

- **Architecture**: See `docs/ARCHITECTURE.md`
- **Testing**: See test files in `tests/`
- **API Reference**: Coming soon (Swagger documentation)
- **Issues**: Report at repository issues page
