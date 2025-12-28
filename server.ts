import express from 'express';
import QRCode from 'qrcode';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Interface for the expected request body
interface GenerateRequest {
    ssid: string;
    password?: string;
    encryption?: 'WPA' | 'WEP' | 'nopass';
    hidden?: boolean;
}

// Generate QR Code Endpoint
app.post('/api/generate', async (req: express.Request, res: express.Response): Promise<void> => {
    try {
        const { ssid, password, encryption = 'WPA', hidden = false } = req.body as GenerateRequest;

        if (!ssid) {
            res.status(400).json({ error: 'SSID is required' });
            return;
        }

        // Construct the WIFI string format:
        // WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<PASSWORD>;H:<true|false|>;;

        // Escape special characters in SSID and Password if necessary (colons, semicolons, backslashes)
        // The standard suggests escaping backslash, semi-colon, comma and colon with backslash.
        // However, simple concatenation is often enough for standard use cases. keeping it simple for now, 
        // but a production robust version might want strictly escaped chars.

        const escape = (str: string) => str.replace(/([\\;,:])/g, '\\$1');

        const cleanSSID = escape(ssid);
        const cleanPassword = password ? escape(password) : '';

        let wifiString = `WIFI:S:${cleanSSID};`;
        wifiString += `T:${encryption};`;
        if (password) {
            wifiString += `P:${cleanPassword};`;
        }
        if (hidden) {
            wifiString += `H:true;`;
        }
        wifiString += ';';

        // Generate QR Code to Buffer (Memory Only - Privacy First)
        const qrBuffer = await QRCode.toBuffer(wifiString, {
            errorCorrectionLevel: 'M',
            type: 'png',
            margin: 4,
            width: 300,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // Convert Buffer to Base64 string
        const base64Image = `data:image/png;base64,${qrBuffer.toString('base64')}`;

        // Return the Base64 image
        res.json({ qrCode: base64Image });

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`GuestPass server running at http://localhost:${port}`);
});
