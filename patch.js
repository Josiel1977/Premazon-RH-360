const fs = require('fs');
const file = 'app/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  /const newDevices = \[\.\.\.devices\];\s*\n\s*\/\/ Order by priority.*?setDevices\(newDevices\);/s,
  `const newDevices = devices.map(d => ({ ...d }));
      
      // Order by priority (AC first, then Pump)
      const priorityOrder = ['ac', 'pump', 'light', 'other'];
      newDevices.sort((a, b) => priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type));

      newDevices.forEach(device => {
        if (!device.isOn && surplus >= device.power) {
          // We have enough surplus to turn this on smartly
          device.isOn = true;
          device.isAutoSmart = true;
          surplus -= device.power;
        } else if (device.isAutoSmart && surplus < 0) {
          // Not enough surplus, turn off smartly activated devices
          device.isOn = false;
          device.isAutoSmart = false;
          surplus += device.power;
        }
      });
      
      // Re-sort back to original id order if you want to keep UI stable
      newDevices.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      
      setDevices(newDevices);`
);
fs.writeFileSync(file, code);
