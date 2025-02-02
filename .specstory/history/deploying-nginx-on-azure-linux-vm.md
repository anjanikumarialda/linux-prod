## SpecStory

## Deploying Nginx on Azure Linux VM (2/2/2025, 4:45:09 AM)

_**User**_

i want to deploy this linux virtual machine in azure , i wanna use nginix , can it be possible ?

---

_**Assistant**_

I'll help you deploy your application to an Azure Linux VM with Nginx. First, let me check the project structure and requirements to provide you with the appropriate deployment steps.

---

_**Assistant**_



---

_**Assistant**_



I can see this is a Next.js application with React and TypeScript. Yes, it's definitely possible to deploy this on an Azure Linux VM with Nginx! Here's what we'll need to do:

1. Set up an Azure Linux VM (Ubuntu is recommended)
2. Install the required software (Node.js, Nginx)
3. Deploy your application
4. Configure Nginx as a reverse proxy

Here's a step-by-step guide to deploy your application:

1. **Create an Azure Linux VM:**
   - Use Ubuntu Server LTS (20.04 or 22.04)
   - Make sure to open ports 80 (HTTP) and 443 (HTTPS) in the network security group
   - Recommended size: at least 2 vCPUs and 4GB RAM (B2s or higher)

2. **Once your VM is ready, SSH into it and run these commands:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm (using Node.js 18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 (for process management)
sudo npm install -g pm2
```

3. **Deploy your application:**
   - Set up a deployment method (Git, SFTP, or Azure DevOps)
   - Clone/copy your code to `/var/www/meeting-time-tracker`
   - Install dependencies and build:
```bash
cd /var/www/meeting-time-tracker
npm install
npm run build
```

4. **Configure Nginx:**
Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/meeting-time-tracker
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain-or-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/meeting-time-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Start your application with PM2:**
```bash
cd /var/www/meeting-time-tracker
pm2 start npm --name "meeting-time-tracker" -- start
pm2 save
pm2 startup
```

Additional considerations:

1. **SSL/HTTPS**: You should secure your site with SSL. You can use Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx
```

2. **Environment Variables**: Make sure to set up your environment variables on the production server:
```bash
nano .env.local
```

3. **Monitoring**: You can monitor your application using PM2:
```bash
pm2 status
pm2 logs
```

Would you like me to provide more specific details about any of these steps? Also, do you have any specific requirements for:
1. Domain name configuration?
2. SSL certificate setup?
3. Environment variables that need to be configured?
4. Specific Azure region preferences?

I can help you with the detailed Azure VM creation process or any other specific aspects of the deployment.

---



---

