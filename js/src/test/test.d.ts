declare class emptyClass {
}
export default class testMainClass extends emptyClass {
    init(exchange: any, symbol: any): Promise<void>;
    expandSettings(exchange: any, symbol: any): void;
    testMethod(methodName: any, exchange: any, args: any, isPublic: any): Promise<any>;
    testSafe(methodName: any, exchange: any, args: any, isPublic: any): Promise<boolean>;
    runPublicTests(exchange: any, symbol: any): Promise<void>;
    loadExchange(exchange: any): Promise<void>;
    getTestSymbol(exchange: any, isSpot: any, symbols: any): any;
    getExchangeCode(exchange: any, codes?: any): any;
    getMarketsFromExchange(exchange: any, spot?: boolean): {};
    getValidSymbol(exchange: any, spot?: boolean): any;
    testExchange(exchange: any, providedSymbol?: any): Promise<void>;
    runPrivateTests(exchange: any, symbol: any): Promise<void>;
    startTest(exchange: any, symbol: any): Promise<void>;
}
export {};
