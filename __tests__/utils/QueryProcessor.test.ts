import QueryProcessor from "../../utils/QueryProcessor";
import '@testing-library/jest-dom'

describe("QueryProcessor", () => {
    test("should return a string", () => {
        const query = "test";
        const response: string = QueryProcessor(query);
        expect(typeof response).toBe("string");
    });

    test('should return shakespeare description', () => {
        const query = "shakespeare";
        const response: string = QueryProcessor(query);
        expect(response).toBe((
            "William Shakespeare (26 April 1564 - 23 April 1616) was an " +
            "English poet, playwright, and actor, widely regarded as the greatest " +
            "writer in the English language and the world's pre-eminent dramatist."
          ));
    });

    test('should return name', () => {
        const query = "What is your name?";
        const response: string = QueryProcessor(query);
        expect(response).toBe((
            "Rohan"
          ));
    })

    test('should return andrewid', () => {
        const query = "What is my andrewid?";
        const response: string = QueryProcessor(query);
        expect(response).toBe((
            "andremil"
        ));
    })

    test('should compute simple addition', () => {
        const query = "What is 98 + 52?";
        const response: string = QueryProcessor(query);
        expect(response).toBe("150");
    })

    test('should compute subtraction and negative results', () => {
        expect(QueryProcessor("What is 5 - 12?")).toBe("-7");
    })

    test('should compute multiplication and division with precedence', () => {
        expect(QueryProcessor("What is 2 + 3 * 4?"))
            .toBe("14");
        expect(QueryProcessor("What is (2 + 3) * 4?"))
            .toBe("20");
    })

    test('should compute decimal results', () => {
        expect(QueryProcessor("What is 7 / 2?"))
            .toBe("3.5");
    })

    test('should handle word operators (plus)', () => {
        expect(QueryProcessor("What is 45 plus 53?"))
            .toBe("98");
    })

    test('should return the largest number from a list', () => {
        expect(QueryProcessor("Which of the following numbers is the largest: 19, 27, 44?"))
            .toBe("44");
    })
});