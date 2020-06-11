import {load} from "protobufjs";
import path from "path";
import Long from "long";

export namespace Smartme {
    export enum Obis {
        CurrentPhaseL1,
        CurrentPhaseL2,
        CurrentPhaseL3,
        ActiveEnergyTotalImport,
        ActiveEnergyTariff1Import,
        ActiveEnergyTariff2Import,
        ActiveEnergyTariff3Import,
        ActiveEnergyTariff4Import,
        ActiveEnergyTotalExport,
        ActivePowerTotal_ImportExport,
        ActivePowerTotal,
        ActivePowerPhaseL1,
        ActivePowerPhaseL2,
        ActivePowerPhaseL3,
        VoltagePhaseL1,
        VoltagePhaseL2,
        VoltagePhaseL3
    }

    export class Value {
        readonly obi : Obis;
        readonly value : number;

        constructor(obi : Obis, value : number) {
            this.obi = obi;
            this.value = value;
        }
    }

    export class DeviceSample {
        readonly dt : Date;
        deviceId : string;
        readonly values : Value[] = [];

        constructor(deviceId : string, dt : Date) {
            this.deviceId = deviceId;
            this.dt = dt;
        }

        public getValue(obi : Obis) : number | undefined {
            let value : Value | undefined;;
            this.values.forEach(v => {
                if (v.obi === obi) value = v;
            })
            return !value ? undefined : value.value;
        }
    }
}

/**
 * Returns true if the supplied Obis matches the supplied bytes.
 * 
 */
const isObis = (obis : Buffer, b1 : number, b2 : number, b3 : number, b4 : number, b5 : number, b6 : number) => {
    return obis[0] === b1 && obis[1] === b2 && obis[2] === b3 && obis[3] === b4 && obis[4] === b5 && obis[5] === b6;
}

// load schema
const protoMsg = (() => {
    return load(path.join(__dirname, "..", "smartme.proto")).then(root => {
        const msg = root.lookupType("DeviceDataArray");
        return Promise.resolve(msg);
    })
})();

export default async (buf : Buffer) : Promise<Smartme.DeviceSample[]> => {
    // decode the buffer
    const msg = await protoMsg;
    const obj = msg.decode(buf) as any;

    const deviceSamples = new Array<Smartme.DeviceSample>();
    obj.DeviceDataItems.forEach((dd : any) => {
        const dt = dd.DateTime;
        const dtLong = Long.fromBits(dt.value.low, dt.value.high, dt.value.unsigned);
        const dateObj = new Date(dtLong.divide(10000).toNumber()); // in ticks, 10000 of a millisecond

        const h = Long.fromBits(dd.DeviceId.lo.low, dd.DeviceId.lo.high, dd.DeviceId.lo.unsigned);
        const l = Long.fromBits(dd.DeviceId.hi.low, dd.DeviceId.hi.high, dd.DeviceId.hi.unsigned);
        const hs = h.toString(16);
        const ls = l.toString(16);
        const g = hs.substring(8) + hs.substring(4,8) + hs.substring(0,4) + ls.substring(14, 16) + ls.substring(12, 14) + ls.substring(10, 12) + ls.substring(8, 10) + ls.substring(6, 8) + ls.substring(4, 6) + ls.substring(2, 4) + ls.substring(0, 2);
        const guid = `${g.substring(0, 8)}-${g.substring(8, 12)}-${g.substring(12, 16)}-${g.substring(16, 20)}-${g.substring(20)}`;

        // create sample
        const deviceSample = new Smartme.DeviceSample(guid, dateObj);
        deviceSamples.push(deviceSample);

        dd.DeviceValues.forEach((v : any) => {
            const obis = v.Obis;
            if (isObis(obis, 0x01, 0x00, 0x1f, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.CurrentPhaseL1, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x33, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.CurrentPhaseL2, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x47, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.CurrentPhaseL3, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x01, 0x08, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActiveEnergyTotalImport, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x01, 0x08, 0x01, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActiveEnergyTariff1Import, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x01, 0x08, 0x02, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActiveEnergyTariff2Import, v.Value));
                
            } else if (isObis(obis, 0x01, 0x00, 0x01, 0x08, 0x03, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActiveEnergyTariff3Import, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x01, 0x08, 0x04, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActiveEnergyTariff4Import, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x02, 0x08, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActiveEnergyTotalExport, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x10, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActivePowerTotal_ImportExport, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x01, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActivePowerTotal, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x15, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActivePowerPhaseL1, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x29, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActivePowerPhaseL2, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x3D, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.ActivePowerPhaseL3, v.Value));

            } else if (isObis(obis, 0x01, 0x00, 0x20, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.VoltagePhaseL1, v.Value));
                
            } else if (isObis(obis, 0x01, 0x00, 0x34, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.VoltagePhaseL2, v.Value));
                
            } else if (isObis(obis, 0x01, 0x00, 0x48, 0x07, 0x00, 0xFF)) {
                deviceSample.values.push(new Smartme.Value(Smartme.Obis.VoltagePhaseL3, v.Value));
                
            }
        })
    })

    // return
    return deviceSamples;
}
