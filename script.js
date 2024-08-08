document.addEventListener('DOMContentLoaded', function () {
    const html5QrCodeConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    let html5QrCode = null;

    const mainScreen = document.getElementById('mainScreen');
    const returnPartsButton = document.getElementById('returnPartsButton');
    const auditPartsButton = document.getElementById('auditPartsButton');
    const returnPartsScreen = document.getElementById('returnPartsScreen');
    const auditPartsScreen = document.getElementById('auditPartsScreen');

    const emailReportButton = document.getElementById('emailReportButton');
    const inventoryEmailButton = document.getElementById('inventoryEmailButton');
    const inventorySmsButton = document.getElementById('inventorySmsButton');
    const inventoryList = document.getElementById('inventoryList');
    const auditForm = document.getElementById('auditForm');
    const auditList = document.getElementById('auditList');
    const addItemButton = document.getElementById('addItemButton');
    const sortLocationButton = document.getElementById('sortLocationButton');
    const sortDateButton = document.getElementById('sortDateButton');
    const emailAuditButton = document.getElementById('emailAuditButton');

    const scannedItems = new Set();
    const notification = document.getElementById('notification');

    returnPartsButton.addEventListener('click', function () {
        switchScreen('returnParts');
    });

    auditPartsButton.addEventListener('click', function () {
        switchScreen('auditParts');
    });

    function switchScreen(screen) {
        mainScreen.classList.add('hidden');
        returnPartsScreen.classList.add('hidden');
        auditPartsScreen.classList.add('hidden');

        if (screen === 'returnParts') {
            returnPartsScreen.classList.remove('hidden');
            initScanner('qr-reader', onScanSuccess);
        } else if (screen === 'auditParts') {
            auditPartsScreen.classList.remove('hidden');
            initScanner('qr-reader-audit', onScanAuditSuccess);
        }
    }

    function initScanner(elementId, scanSuccessCallback) {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                html5QrCode = null;
                startScanner(elementId, scanSuccessCallback);
            }).catch(err => {
                console.error('Error stopping scanner:', err);
            });
        } else {
            startScanner(elementId, scanSuccessCallback);
        }
    }

    function startScanner(elementId, scanSuccessCallback) {
        html5QrCode = new Html5Qrcode(elementId);
        html5QrCode.start(
            { facingMode: "environment" },
            html5QrCodeConfig,
            scanSuccessCallback,
            onScanError
        ).catch(err => {
            console.error('Error starting scanner:', err);
            alert('Error starting scanner. Please try again.');
        });
    }

    function onScanSuccess(decodedText) {
        if (!scannedItems.has(decodedText)) {
            scannedItems.add(decodedText);
            addItemToList(decodedText);
            playBeep();
            showNotification();
        } else {
            console.log('Item already scanned:', decodedText);
        }
    }

    function onScanAuditSuccess(decodedText) {
        const data = parseAuditData(decodedText);
        if (data) {
            document.getElementById('customer').value = data.customer;
            document.getElementById('part').value = data.part;
            document.getElementById('supplier').value = data.supplier;
            document.getElementById('order').value = data.order;
            document.getElementById('labeled').value = data.labeled;
        } else {
            alert('Invalid QR code format for audit.');
        }
    }

    function onScanError(error) {
        console.warn(`QR error: ${error}`);
    }

    function parseAuditData(decodedText) {
        const data = {};
        const regex = /CUSTOMER=(.*);PART=(.*);SUPPLIER=(.*);ORDER=(.*);LABELED=(.*);/;
        const match = decodedText.match(regex);
        if (match) {
            data.customer = match[1];
            data.part = match[2];
            data.supplier = match[3];
            data.order = match[4];
            data.labeled = match[5];
            return data;
        }
        return null;
    }

    addItemButton.addEventListener('click', function () {
        const customer = document.getElementById('customer').value;
        const part = document.getElementById('part').value;
        const supplier = document.getElementById('supplier').value;
        const order = document.getElementById('order').value;
        const labeled = document.getElementById('labeled').value;
        const location = document.getElementById('location').value;

        if (!customer || !part || !supplier || !order || !labeled || !location) {
            alert('Please fill in all fields.');
            return;
        }

        const item = {
            customer,
            part,
            supplier,
            order,
            labeled,
            location
        };

        const li = document.createElement('li');
        li.dataset.item = JSON.stringify(item);
        li.innerHTML = `
            <div>Customer: ${customer}</div>
            <div>Part: ${part}</div>
            <div>Supplier: ${supplier}</div>
            <div>Order: ${order}</div>
            <div>Labeled: ${labeled}</div>
            <div>Location: ${location}</div>
            <div class="edit-remove-buttons">
                <button class="edit-button">Edit</button>
                <button class="remove-button" style="margin-left: auto;">Remove</button>
            </div>
        `;
        auditList.appendChild(li);

        li.querySelector('.edit-button').addEventListener('click', () => editItem(li));
        li.querySelector('.remove-button').addEventListener('click', () => removeItem(li));
    });

    function editItem(li) {
        const item = JSON.parse(li.dataset.item);
        document.getElementById('customer').value = item.customer;
        document.getElementById('part').value = item.part;
        document.getElementById('supplier').value = item.supplier;
        document.getElementById('order').value = item.order;
        document.getElementById('labeled').value = item.labeled;
        document.getElementById('location').value = item.location;
        li.remove();
    }

    function removeItem(li) {
        li.remove();
    }

    sortLocationButton.addEventListener('click', function () {
        sortList(auditList, 'location');
    });

    sortDateButton.addEventListener('click', function () {
        sortList(auditList, 'labeled');
    });

    emailAuditButton.addEventListener('click', function () {
        sendAuditEmailReport();
    });

    function sortList(list, key) {
        const items = Array.from(list.children);
        items.sort((a, b) => {
            const itemA = JSON.parse(a.dataset.item);
            const itemB = JSON.parse(b.dataset.item);
            if (itemA[key] < itemB[key]) return -1;
            if (itemA[key] > itemB[key]) return 1;
            return 0;
        });
        items.forEach(item => list.appendChild(item));
    }

    function playBeep() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    }

    function showNotification() {
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 2000);
    }
});
