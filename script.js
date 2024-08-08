document.addEventListener('DOMContentLoaded', () => {
    let html5QrCodeReturn;
    let html5QrCodeAudit;
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
    const sortLocationButton = document.getElementById('sortLocationButton');
    const sortDateButton = document.getElementById('sortDateButton');
    const emailAuditButton = document.getElementById('emailAuditButton');

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
    sortLocationButton.addEventListener('click', () => sortList('location'));
    sortDateButton.addEventListener('click', () => sortList('date'));
    emailAuditButton.addEventListener('click', sendAuditEmailReport);

    function switchScreen(screen) {
        mainScreen.classList.add('hidden');
        returnPartsScreen.classList.add('hidden');
        auditPartsScreen.classList.add('hidden');

        if (scanning) {
            stopScanning().then(() => {
                showScreen(screen);
            }).catch(err => {
                console.error('Error stopping scanner:', err);
                showScreen(screen);
            });
        } else {
            showScreen(screen);
        }
    }

    function showScreen(screen) {
        if (screen === 'returnParts') {
            returnPartsScreen.classList.remove('hidden');
            initScanner('returnParts');
        } else if (screen === 'auditParts') {
            auditPartsScreen.classList.remove('hidden');
            initScanner('auditParts');
        }
    }

    function initScanner(type) {
        if (type === 'returnParts') {
            html5QrCodeReturn = new Html5Qrcode("qr-reader");
            startScanning(html5QrCodeReturn);
        } else if (type === 'auditParts') {
            html5QrCodeAudit = new Html5Qrcode("qr-reader-audit");
            startScanning(html5QrCodeAudit);
        }
    }

    function startScanning(scanner) {
        if (!scanning) {
            scanner.start(
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
        return new Promise((resolve, reject) => {
            if (scanning) {
                if (html5QrCodeReturn) {
                    html5QrCodeReturn.stop().then(() => {
                        html5QrCodeReturn.clear();
                        html5QrCodeReturn = null;
                        scanning = false;
                        stopButton.disabled = true;
                        startButton.disabled = false;
                        resolve();
                    }).catch(err => reject(err));
                } else if (html5QrCodeAudit) {
                    html5QrCodeAudit.stop().then(() => {
                        html5QrCodeAudit.clear();
                        html5QrCodeAudit = null;
                        scanning = false;
                        stopButton.disabled = true;
                        startButton.disabled = false;
                        resolve();
                    }).catch(err => reject(err));
                }
            } else {
                resolve();
            }
        });
    }

    function onScanSuccess(decodedText) {
        console.log('Scanned item:', decodedText);
        if (!scannedItems.has(decodedText)) {
            scannedItems.add(decodedText);
            if (document.getElementById('returnPartsScreen').classList.contains('hidden')) {
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

        document.getElementById('customer').value = fields.customer || '';
        document.getElementById('part').value = fields.part || '';
        document.getElementById('supplier').value = fields.supplier || '';
        document.getElementById('order').value = fields.order || '';
        document.getElementById('labeled').value = fields.labeled || '';
        document.getElementById('location').value = '';
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
        li.innerHTML = `
            <div><strong>Customer:</strong> ${item.customer}</div>
            <div><strong>Part:</strong> ${item.part}</div>
            <div><strong>Supplier:</strong> ${item.supplier}</div>
            <div><strong>Order:</strong> ${item.order}</div>
            <div><strong>Labeled:</strong> ${item.labeled}</div>
            <div><strong>Location:</strong> ${item.location}</div>
            <div class="edit-remove-buttons">
                <button class="edit-button">Edit</button>
                <button class="remove-button">Remove</button>
            </div>
        `;
        li.dataset.item = JSON.stringify(item);

        const editButton = li.querySelector('.edit-button');
        editButton.addEventListener('click', () => editItem(li));

        const removeButton = li.querySelector('.remove-button');
        removeButton.addEventListener('click', () => li.remove());

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
            if (criteria === 'location') return a.location.localeCompare(b.location);
            if (criteria === 'date') return new Date(a.labeled) - new Date(b.labeled);
        });
        auditList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div><strong>Customer:</strong> ${item.customer}</div>
                <div><strong>Part:</strong> ${item.part}</div>
                <div><strong>Supplier:</strong> ${item.supplier}</div>
                <div><strong>Order:</strong> ${item.order}</div>
                <div><strong>Labeled:</strong> ${item.labeled}</div>
                <div><strong>Location:</strong> ${item.location}</div>
                <div class="edit-remove-buttons">
                    <button class="edit-button">Edit</button>
                    <button class="remove-button">Remove</button>
                </div>
            `;
            li.dataset.item = JSON.stringify(item);

            const editButton = li.querySelector('.edit-button');
            editButton.addEventListener('click', () => editItem(li));

            const removeButton = li.querySelector('.remove-button');
            removeButton.addEventListener('click', () => li.remove());

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

    function sendAuditEmailReport() {
        const items = Array.from(auditList.children)
            .map(li => JSON.parse(li.dataset.item))
            .map(item => `
                Customer: ${item.customer}
                Part: ${item.part}
                Supplier: ${item.supplier}
                Order: ${item.order}
                Labeled: ${item.labeled}
                Location: ${item.location}
            `).join('\n\n');

        const report = `Audit Parts:\n\n${items}\n\n20/20 Auto Glass`;
        const subject = encodeURIComponent('Audit Parts Report');
        const body = encodeURIComponent(report);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
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

    function addItemToList(item) {
        const lines = item.split('\n');
        const firstLine = lines[0].trim();
        const isReturn = firstLine.includes('Return');
        let vendor = isReturn ? firstLine.split(' ')[0] : null;

        const li = document.createElement('li');
        const itemContent = document.createElement('span');
        itemContent.className = 'item-content';
        itemContent.textContent = item;

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-button';
        removeButton.onclick = () => {
            li.remove();
            scannedItems.delete(item);
            updateVendorSectionVisibility();
        };

        li.appendChild(itemContent);
        li.appendChild(removeButton);

        if (isReturn) {
            if (!vendorSections[vendor]) {
                createVendorSection(vendor);
            }
            vendorSections[vendor].list.appendChild(li);
            vendorSections[vendor].section.style.display = 'block';
        } else {
            inventoryList.appendChild(li);
            inventorySection.style.display = 'block';
        }
    }

    function createVendorSection(vendor) {
        const section = document.createElement('div');
        section.id = `${vendor}Section`;
        section.className = 'vendor-section';

        const h2 = document.createElement('h2');
        h2.textContent = `${vendor} Returns`;
        section.appendChild(h2);

        const list = document.createElement('ul');
        list.id = `${vendor}List`;
        list.className = 'vendor-list';
        section.appendChild(list);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'vendor-button-container';

        const emailButton = document.createElement('button');
        emailButton.id = `${vendor}EmailButton`;
        emailButton.className = 'vendor-button email-button';
        emailButton.textContent = `Email ${vendor} Returns`;
        emailButton.onclick = () => emailVendorReturns(vendor);
        buttonContainer.appendChild(emailButton);

        const smsButton = document.createElement('button');
        smsButton.id = `${vendor}SmsButton`;
        smsButton.className = 'vendor-button sms-button';
        smsButton.textContent = `SMS ${vendor} Returns`;
        smsButton.onclick = () => smsVendorReturns(vendor);
        buttonContainer.appendChild(smsButton);

        section.appendChild(buttonContainer);
        document.body.appendChild(section);

        vendorSections[vendor] = { section, list, emailButton, smsButton };
    }

    function updateVendorSectionVisibility() {
        inventorySection.style.display =
            inventoryList.children.length > 0 ? 'block' : 'none';

        for (const vendor in vendorSections) {
            vendorSections[vendor].section.style.display =
                vendorSections[vendor].list.children.length > 0 ? 'block' : 'none';
        }
    }

    function emailVendorReturns(vendor) {
        const items = Array.from(vendorSections[vendor].list.children)
            .map(li => li.querySelector('.item-content').textContent);

        const report = `These items are labeled and ready to be picked up in our return area:\n\n${items.join('\n\n')}\n\n20/20 Auto Glass`;

        const subject = encodeURIComponent(`${vendor} Returns`);
        const body = encodeURIComponent(report);
        let email = vendorContacts[vendor]?.email || '';
        let ccEmail = '';

        if (Array.isArray(email)) {
            ccEmail = `&cc=${encodeURIComponent(email[1])}`;
            email = email[0];
        }

        window.location.href = `mailto:${email}?subject=${subject}&body=${body}${ccEmail}`;
    }

    function smsVendorReturns(vendor) {
        const items = Array.from(vendorSections[vendor].list.children)
            .map(li => li.querySelector('.item-content').textContent);

        const report = `These items are labeled and ready to be picked up in our return area:\n\n${items.join('\n\n')}\n\n20/20 Auto Glass`;

        const smsNumbers = vendorContacts[vendor]?.sms || '';
        const smsNumberList = Array.isArray(smsNumbers) ? smsNumbers.join(',') : smsNumbers;

        window.location.href = `sms:${smsNumberList}?body=${encodeURIComponent(report)}`;
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
});
