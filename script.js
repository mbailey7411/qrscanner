document.addEventListener('DOMContentLoaded', () => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };
    let scanning = false;

    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const emailReportButton = document.getElementById('emailReportButton');
    const inventoryEmailButton = document.getElementById('inventoryEmailButton');
    const inventorySmsButton = document.getElementById('inventorySmsButton');
    const inventoryList = document.getElementById('inventoryList');
    const notification = document.getElementById('notification');
    const inventorySection = document.getElementById('inventorySection');

    const returnPartsButton = document.getElementById('returnPartsButton');
    const auditPartsButton = document.getElementById('auditPartsButton');
    const mainScreen = document.getElementById('mainScreen');
    const returnPartsScreen = document.getElementById('returnPartsScreen');
    const auditPartsScreen = document.getElementById('auditPartsScreen');

    const auditForm = document.getElementById('auditForm');
    const addItemButton = document.getElementById('addItemButton');
    const auditList = document.getElementById('auditList');
    const sortOrderButton = document.getElementById('sortOrderButton');
    const sortLocationButton = document.getElementById('sortLocationButton');
    const sortDateButton = document.getElementById('sortDateButton');

    const scannedItems = new Set();
    let audioContext;
    const vendorSections = {};
    const vendorContacts = {
        'PGW': { email: 'RGrier@pgwautoglass.com', sms: '8645057843' },
        'Pilkington': { email: ['marco.yeargin@nsg.com', 'Caleb.ford@nsg.com'], sms: ['8643039699', '8642010487'] },
        'Mygrant': { email: 'poliver@mygrantglass.com', sms: '7045176639' }
    };

    returnPartsButton.addEventListener('click', () => switchScreen('returnParts'));
    auditPartsButton.addEventListener('click', () => switchScreen('auditParts'));
    stopButton.addEventListener('click', stopScanning);
    startButton.addEventListener('click', startScanning);
    emailReportButton.addEventListener('click', sendEmailReport);
    inventoryEmailButton.addEventListener('click', sendInventoryEmailReport);
    inventorySmsButton.addEventListener('click', sendInventorySmsReport);
    addItemButton.addEventListener('click', addItem);
    sortOrderButton.addEventListener('click', () => sortList('order'));
    sortLocationButton.addEventListener('click', () => sortList('location'));
    sortDateButton.addEventListener('click', () => sortList('date'));

    window.addEventListener('load', initScanner);

    function switchScreen(screen) {
        mainScreen.classList.add('hidden');
        returnPartsScreen.classList.add('hidden');
        auditPartsScreen.classList.add('hidden');

        if (screen === 'returnParts') {
            returnPartsScreen.classList.remove('hidden');
        } else if (screen === 'auditParts') {
            auditPartsScreen.classList.remove('hidden');
        }
    }

    function initScanner() {
        startScanning();
        document.addEventListener('click', initAudio, { once: true });
    }

    function startScanning() {
        if (!scanning) {
            html5QrCode.start(
                { facingMode: "environment" },
                qrConfig,
                onScanSuccess,
                onScanError
            ).then(() => {
                scanning = true;
                stopButton.disabled = false;
                startButton.disabled = true;
            }).catch(err => {
                console.error('Error starting scanner:', err);
                alert('Error starting scanner. Please try again.');
            });
        }
    }

    function stopScanning() {
        if (scanning) {
            html5QrCode.stop().then(() => {
                scanning = false;
                stopButton.disabled = true;
                startButton.disabled = false;
            }).catch(err => console.error('Error stopping scanner:', err));
        }
    }

    function onScanSuccess(decodedText) {
        console.log('Scanned item:', decodedText);
        if (!scannedItems.has(decodedText)) {
            scannedItems.add(decodedText);
            if (decodedText.includes('CUSTOMER=')) {
                handleAuditScan(decodedText);
            } else {
                addItemToList(decodedText);
            }
            playBeep();
            showNotification();
        } else {
            console.log('Item already scanned:', decodedText);
        }
    }

    function onScanError(error) {
        console.warn(`QR error: ${error}`);
    }

    function handleAuditScan(decodedText) {
        const fields = decodedText.split(';').reduce((acc, field) => {
            const [key, value] = field.split('=');
            acc[key.toLowerCase()] = value;
            return acc;
        }, {});

        if (!fields.customer || !fields.part || !fields.supplier || !fields.order || !fields.labeled) {
            alert('Invalid QR code format.');
            return;
        }

        document.getElementById('customer').value = fields.customer || '';
        document.getElementById('part').value = fields.part || '';
        document.getElementById('supplier').value = fields.supplier || '';
        document.getElementById('order').value = fields.order || '';
        document.getElementById('labeled').value = fields.labeled || '';
        const location = prompt('Enter the location:');
        document.getElementById('location').value = location || '';
    }

    function addItem() {
        const customer = document.getElementById('customer').value;
        const part = document.getElementById('part').value;
        const supplier = document.getElementById('supplier').value;
        const order = document.getElementById('order').value;
        const labeled = document.getElementById('labeled').value;
        const location = document.getElementById('location').value;

        if (!customer || !part || !supplier || !order || !labeled || !location) {
            alert('All fields are required.');
            return;
        }

        const item = {
            customer,
            part,
            supplier,
            order,
            labeled,
            location,
            added: new Date().toISOString()
        };

        const li = document.createElement('li');
        li.textContent = JSON.stringify(item);
        li.dataset.item = JSON.stringify(item);

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editItem(li));
        li.appendChild(editButton);

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => li.remove());
        li.appendChild(removeButton);

        auditList.appendChild(li);
        auditForm.reset();
    }

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

    function sortList(criteria) {
        const items = Array.from(auditList.children).map(li => JSON.parse(li.dataset.item));
        items.sort((a, b) => {
            if (criteria === 'order') return a.order.localeCompare(b.order);
            if (criteria === 'location') return a.location.localeCompare(b.location);
            if (criteria === 'date') return new Date(a.labeled) - new Date(b.labeled);
        });
        auditList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = JSON.stringify(item);
            li.dataset.item = JSON.stringify(item);

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => editItem(li));
            li.appendChild(editButton);

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => li.remove());
            li.appendChild(removeButton);

            auditList.appendChild(li);
        });
    }

    function sendEmailReport() {
        let report = 'Inventory Items:\n\n';
        report += Array.from(inventoryList.children)
            .map(li => li.querySelector('.item-content').textContent)
            .join('\n\n');
    
        for (const vendor in vendorSections) {
            if (vendorSections[vendor].list.children.length > 0) {
                report += `\n\n${vendor} Returns:\n\n`;
                report += Array.from(vendorSections[vendor].list.children)
                    .map(li => li.querySelector('.item-content').textContent)
                    .join('\n\n');
        }
    }

    const subject = encodeURIComponent('Scan Report');
    const body = encodeURIComponent(`${report}\n\n20/20 Auto Glass`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

    function sendInventoryEmailReport() {
        const items = Array.from(inventoryList.children)
            .map(li => li.querySelector('.item-content').textContent);

        const report = `Inventory Items:\n\n${items.join('\n\n')}\n\n20/20 Auto Glass`;

        const subject = encodeURIComponent('Inventory Report');
        const body = encodeURIComponent(report);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }

    function sendInventorySmsReport() {
        const items = Array.from(inventoryList.children)
            .map(li => li.querySelector('.item-content').textContent);

        const report = `Inventory Items:\n\n${items.join('\n\n')}\n\n20/20 Auto Glass`;

        window.location.href = `sms:?body=${encodeURIComponent(report)}`;
    }

    function initAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    function playBeep() {
        if (!audioContext) initAudio();

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
