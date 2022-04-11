import fs from "fs";
import Contract from "web3-eth-contract";
import marketContract from "../../marketContract";
import database from "../../database.json";

const myAddress = "0xa29457a812eb5cc2ad4ea52b62d1f8a1922306ac";
Contract.setProvider(
  "https://rinkeby.infura.io/v3/9e6f288e4614414ba79396ab95fa410a"
);
const ABI = marketContract["abi"];
const myContract = new Contract(ABI, myAddress);

let myData = { ...database };

export default function handler(req, res) {
  updateDatabase();
  res.status(200).json({ response: myData });
}

const updateDatabase = () => {
  getProductNumber();
};

const getProductNumber = async () => {
  myContract.methods
    .productNumber()
    .call()
    .then((resp) => {
      poppulateData(resp);
    });
};

const poppulateData = async (productNumber) => {
  for (let i = 1; i <= productNumber; i++)
    await myContract.methods
      .getProductData(i)
      .call()
      .then((resp) => {
        if (!(i in myData)) {
          myData[i] = {
            name: "",
            id: i,
            description: "",
            quantity: 0,
            Owner: "",
            availability: false,
            floorPrice: 0,
            launchTime: 0,
          };
        }
        myData[i]["name"] = resp[0];
        myData[i]["id"] = i;
        myData[i]["description"] = resp[1];
        myData[i]["quantity"] = resp[2];
        myData[i]["Owner"] = resp[3];

        myContract.methods
          .getProductSaleData(i)
          .call()
          .then((resp) => {
            myData[i]["availability"] = resp[0];
            myData[i]["floorPrice"] = resp[1];
            myData[i]["launchTime"] = resp[2];
            let myDataStringified = JSON.stringify(myData);
            fs.writeFile("database.json", myDataStringified, (err) => {
              throw err;
            });
          });
      });
};
