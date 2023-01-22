import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UpdateUserFlightDto } from './dto/update-user-flight.dto';
import {
  User,
  UserFlightTypeORM,
  ScanDateORM,
  DepartureDate,
  ReturnDatesORM,
} from './entities/user-flight.entity';
import {
  ReturnDates,
  ScanDate,
  UserFlight,
  UserFlightDocument,
} from './schema/userFlight.schema';

@Injectable()
export class UserFlightsService {
  constructor(
    @InjectModel(UserFlight.name)
    private userFlightModel: Model<UserFlightDocument>,
    @InjectRepository(UserFlightTypeORM)
    private UserFlightTypeORMRepository: Repository<UserFlightTypeORM>,
    @InjectRepository(ScanDateORM)
    private ScanDateRepository: Repository<ScanDateORM>,
    @InjectRepository(User)
    private UserRepository: Repository<User>,
    @InjectRepository(DepartureDate)
    private DepartureDateRepository: Repository<DepartureDate>,
    @InjectRepository(ReturnDatesORM)
    private ReturnDateRepository: Repository<ReturnDatesORM>,
    private userService: UserService,
  ) {}

  // async create(createUserFlightDto: CreateUserFlightDto) {
  //   const {
  //     currencyCode,
  //     fullCurrency,
  //     departureDate,
  //     maximumHoliday,
  //     minimalHoliday,
  //     requiredDayEnd,
  //     requiredDayStart,
  //     returnDate,
  //     weekendOnly,
  //     arrival,
  //     departure,
  //     returnFlight,
  //     isBeingScanned,
  //     nextScan,
  //     ref,
  //     scannedLast,
  //     fingerPrintId,
  //     sub,
  //   } = createUserFlightDto;
  //   const createFlight: UserFlight = {
  //     ref,
  //     isBeingScanned,
  //     workerPID: 0,
  //     lastUpdated: 0,
  //     user: {
  //       fingerPrintId: randomUUID(),
  //       sub: randomUUID(),
  //     },
  //     scannedLast,
  //     nextScan,
  //     status: false,
  //     currency: {
  //       fullCurrency,
  //       currencyCode,
  //     },
  //     flights: {
  //       departure,
  //       arrival,
  //       returnFlight,
  //     },
  //     dates: {
  //       departureDate: new Date(departureDate),
  //       returnDate: new Date(returnDate),
  //       minimalHoliday,
  //       maximumHoliday,
  //     },
  //   };
  //   const test = await this.userFlightModel.create(createFlight);
  //   console.log(test);
  //   return 'This action adds a new userFlight';
  // }

  async create(payload: UserFlight) {
    // This is not becoming a date properly which is why this is happening.
    payload.dates.departureDate = new Date(payload.dates.departureDate);
    payload.dates.returnDate = new Date(payload.dates.returnDate);
    const test = await this.userFlightModel.create(payload);
    console.log(test);
    return 'This action adds a new userFlight';
  }

  async findAll() {
    return await this.userFlightModel.find();
  }

  async findOne(id: string) {
    return await this.userFlightModel.findOne({ ref: id });
  }

  async findBySubId(id: string) {
    return await this.userFlightModel.find({ 'user.sub': id });
  }

  update(id: number, updateUserFlightDto: UpdateUserFlightDto) {
    return `This action updates a #${id} userFlight`;
  }

  remove(id: number) {
    return `This action removes a #${id} userFlight`;
  }

  sortCheapestFlights(mostRecentScan: ScanDate) {
    if (!mostRecentScan)
      return {
        cheapestFlightsOrderMax: [],
        bestFlightsOrderMax: [],
      };
    const cheapestObject: ReturnDates[] = [];
    const bestObject: ReturnDates[] = [];
    for (const departureDateArray of mostRecentScan.departureDate) {
      for (const returnDateArray of departureDateArray.returnDates) {
        if (returnDateArray.cheapest.cost > 0)
          cheapestObject.push(returnDateArray);
        if (returnDateArray.best.cost > 0) bestObject.push(returnDateArray);
      }
    }
    const cheapestFlightsSorted = cheapestObject
      .sort((a, b) => a.cheapest.cost - b.cheapest.cost)
      .filter((_scan, index) => index < 10);
    const bestFlightsSorted = bestObject
      .sort((a, b) => a.best.cost - b.best.cost)
      .filter((_scan, index) => index < 10);

    return {
      cheapestFlightsOrderMax: cheapestFlightsSorted,
      bestFlightsOrderMax: bestFlightsSorted,
    };
  }

  async getMostRecentScannedFlights(id: string) {
    const reference = await this.findOne(id);
    delete reference.scanDate;
    const mostRecentScan = reference.scanDate.at(-1);
    const sortedFlights = this.sortCheapestFlights(mostRecentScan);
    return { latestFlights: sortedFlights, result: reference };
  }

  async fingerprintLast24Days(fingerPrintId: string) {
    const result = await this.userFlightModel
      .find({
        $and: [
          { 'user.fingerPrintId': fingerPrintId },
          { created: { $gte: new Date().toISOString().split('T')[0] } },
        ],
      })
      .lean();
    return result.length;
  }

  // TypeORM

  async createTest() {
    const user: User = {
      fingerPrintId: randomUUID(),
      sub: randomUUID(),
    };
    const userTest = this.UserRepository.create(user);
    await this.UserRepository.save(userTest);
    const createFlight: UserFlightTypeORM = {
      id: randomUUID(),
      ref: randomUUID(),
      created: new Date(),
      isBeingScanned: false,
      workerPID: 0,
      lastUpdated: 0,
      user: userTest,
      scannedLast: 1674168122118,
      nextScan: 1674254522118,
      status: false,
      currency: {
        fullCurrency: 'EUR - €',
        currencyCode: 'EUR',
      },
      flights: {
        departure: 'Belfast',
        arrival: 'Paris',
        returnFlight: true,
      },
      dates: {
        departureDate: new Date('2023-01-12T00:00:00.000+00:00'),
        returnDate: new Date('2023-01-17T00:00:00.000+00:00'),
        minimalHoliday: 3,
        maximumHoliday: 5,
      },
    };
    const userFlightSaved = await this.UserFlightTypeORMRepository.save(
      createFlight,
    );

    const scanDateTest: ScanDateORM = await this.ScanDateRepository.save({
      dateOfScanLoop: new Date(),
      userFlight: userFlightSaved,
    });

    const departureDateTest: DepartureDate =
      await this.DepartureDateRepository.save({
        date: new Date(),
        dateString: new Date().toString(),
        scanDate: scanDateTest,
      });

    const returnDateTest: ReturnDatesORM = {
      departureDates: departureDateTest,
      departDate: new Date(),
      returnDate: new Date(),
      daysBetweenDepartureDateAndArrivalDate: 1,
      dateString: new Date().toDateString(),
      url: 'https://www.skyscanner.net/transport/flights/belf/pari/230112/230113/?adultsv2=1&currency=EUR&rtn=1&stops=direct',
      flightDatesString: {
        departDate: 'hello',
        returnDate: 'hello',
      },
      cheapest: {
        cost: 157,
        costWithCurrency: '157 €',
        time: '17:30',
        arrival: '20:15',
        durationOfFlight: '1h 45',
      },
      best: {
        cost: 157,
        costWithCurrency: '157 €',
        time: '17:30',
        arrival: '20:15',
        durationOfFlight: '1h 45',
      },
    };

    await this.ReturnDateRepository.save(returnDateTest);
    return 'This action adds a new userFlight';
  }

  async getTests() {
    const test = await this.UserFlightTypeORMRepository.find({});
    console.log(test[0].scanDate[0].departureDate[0].returnDates[0]);
  }

  async checkIfFingerprintUsedToday(fingerprint: string) {
    const testDate = new Date();
    testDate.setHours(0, 0, 0, 0);
    return (
      await this.UserFlightTypeORMRepository.findBy({
        user: {
          fingerPrintId: fingerprint,
        },
        created: MoreThanOrEqual(testDate),
      })
    ).length;
  }

  async findFlightsBySub(sub: string) {
    return await this.UserFlightTypeORMRepository.findBy({
      user: {
        sub,
      },
    });
  }

  async findFlightByRef(ref: string) {
    return await this.UserFlightTypeORMRepository.findBy({ ref });
  }

  async findFlightsByUser(userId: string) {
    const user = await this.userService.findOne(userId);
    return await this.UserFlightTypeORMRepository.findBy({ user });
  }
}
