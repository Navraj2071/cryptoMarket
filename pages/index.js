import marketContract from "../marketContract";
import { useEthers } from "@usedapp/core";
import { useState, useEffect, useReducer } from "react";
import Web3 from "web3";
import Contract from "web3-eth-contract";
import React from "react";

export default function Home() {
  const myAddress = "0xa29457a812eb5cc2ad4ea52b62d1f8a1922306ac";
  const { account, chainId, activateBrowserWallet, deactivate } = useEthers();
  const [isConnected, setIsConnected] = useState(false);
  const formPageArray = {
    0: "",
    1: "createForm",
    2: "sellForm",
    3: "bidForm",
    4: "closeBidForm",
  };
  const [formPage, setFormPage] = useState(formPageArray[0]);
  const [bidProductId, setBidProductId] = useState(0);
  const [closeBidProductId, setCloseBidProductId] = useState(0);
  const [productData, setProductData] = useState({});

  useEffect(() => {
    if (account === undefined) {
      getProductData();
      setIsConnected(false);
    } else {
      setIsConnected(true);
    }
  }, [account]);

  // Contract Data
  Contract.setProvider(Web3.givenProvider);
  const ABI = marketContract["abi"];
  const myContract = new Contract(ABI, myAddress);

  // getting Product data from server

  const getProductData = async () => {
    let response = await fetch("/api/updateDatabase").then((resp) => {
      return resp.json();
    });
    setProductData({ ...response["response"] });
  };

  const convertToUnix = (date, time) => {
    let d = new Date(date + " " + time);
    let unixD = d.getTime();
    return Math.round(unixD / 1000);
  };

  const getRandomKey = (starter) => {
    let randomKey =
      Math.round(Math.random() * 10000, 4).toString() + starter.toString();
    return randomKey;
  };

  const ProductData = () => {
    return (
      <>
        <h1 style={{ padding: "20px 50px" }}>Products </h1>
        {"1" in productData && (
          <div className="cardholder">
            {Object.keys(productData).map((productId) => {
              let availability =
                productData[productId]["availability"] &&
                checkAvailability(productData[productId]["launchTime"]);
              return (
                <React.Fragment key={getRandomKey(productId)}>
                  <div className="card">
                    <h2>{productData[productId]["name"]}</h2>
                    <h6>{productData[productId]["description"]}</h6>
                    <h6>Quantity: {productData[productId]["quantity"]}</h6>
                    <h6>Product Id: {productData[productId]["id"]}</h6>
                    <h6>{availability ? "Available" : "Not for Sale"}</h6>
                    {productData[productId]["availability"] &&
                    !availability &&
                    productData[productId]["Owner"] === account ? (
                      <>
                        <button
                          onClick={() => {
                            setCloseBidProductId(productId);
                            setFormPage(formPageArray[4]);
                          }}
                        >
                          Close Bid
                        </button>
                      </>
                    ) : (
                      <>
                        {!availability &&
                        productData[productId]["Owner"] === account ? (
                          <>
                            <button
                              onClick={() => {
                                setFormPage(formPageArray[2]);
                              }}
                            >
                              Sell
                            </button>
                          </>
                        ) : (
                          <></>
                        )}
                      </>
                    )}
                    {availability &&
                    productData[productId]["Owner"] !== account ? (
                      <>
                        <button
                          onClick={() => {
                            setFormPage(formPageArray[3]);
                          }}
                        >
                          Place Bid
                        </button>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const CreateProduct = () => {
    const [status, setStatus] = useState("");
    const [canCreate, setCanCreate] = useState(true);
    const [canSell, setCanSell] = useState(false);
    const create = async () => {
      setCanCreate(false);
      setStatus("Creating...");
      let productName = document.getElementById("nameForm").value;
      let productDescription = document.getElementById("descriptionForm").value;
      let productQuantity = document.getElementById("quantityForm").value;
      if (
        productName === "" ||
        productDescription === "" ||
        productQuantity <= 0
      ) {
        setStatus("Data incomplete.");
        setCanCreate(true);
      } else {
        setStatus("Waiting for transaction...");
        myContract.methods
          .createProduct(productName, productDescription, productQuantity)
          .send({ from: account })
          .on("error", (error) => {
            setStatus(error["message"]);
            setCanCreate(true);
          })
          .then((resp) => {
            let createdProductId =
              resp["events"]["productCreated"]["returnValues"][0];
            setStatus(
              "Product created successfully. Product Id: " + createdProductId
            );
            setCanSell(true);
          })
          .catch((err) => {
            setStatus(
              "Something went wrong. Are you connected to Rinkeby network?"
            );
            setCanCreate(true);
          });
      }
    };
    if (formPage === formPageArray[1]) {
      return (
        <>
          <div className="inputform">
            <button
              onClick={() => setFormPage(formPageArray[0])}
              className="closeButton"
            >
              Close [X]
            </button>
            <form>
              <label htmlFor="nameForm">Name:</label>
              <input type="text" placeholder="Product name" id="nameForm" />
              <label htmlFor="descriptionForm">Description:</label>
              <input
                type="text"
                placeholder="Brief description"
                id="descriptionForm"
              />
              <label htmlFor="quantityForm">Quantity:</label>
              <input
                type="number"
                placeholder="Items per sale"
                id="quantityForm"
              />
            </form>
            {canCreate && (
              <button onClick={() => create()}>Create Product</button>
            )}
            <h2 style={{ color: "white" }}>{status}</h2>
            {canSell && (
              <>
                <h2 style={{ color: "white" }}>Put it up for sale.</h2>
                <button
                  onClick={() => {
                    setFormPage(formPageArray[2]);
                  }}
                >
                  Sell
                </button>
              </>
            )}
          </div>
        </>
      );
    } else {
      return <></>;
    }
  };
  const SellProduct = () => {
    const [status, setStatus] = useState("");
    const [canSell, setCanSell] = useState(true);

    const sell = async () => {
      setCanSell(false);
      setStatus("Creating sale...");
      let productId = document.getElementById("idForm").value;
      let productPrice = (
        document.getElementById("floorForm").value *
        10 ** 18
      ).toString();
      let productDate = document.getElementById("dateForm").value;
      let productTime = document.getElementById("timeForm").value;
      let launchTime = convertToUnix(productDate, productTime);
      let nowDate = new Date();
      let nowDateUnix = convertToUnix(nowDate, "");
      if (nowDateUnix > launchTime) {
        setCanSell(true);
        setStatus("Please provide a future date and time");
        return;
      }
      if (productId <= 0 || productPrice <= 0) {
        setStatus("Data incomplete.");
        setCanSell(true);
      } else {
        setStatus("Waiting for transaction...");
        myContract.methods
          .putUpForSale(productId, productPrice, launchTime)
          .send({ from: account })
          .on("error", (error) => {
            setStatus(error["message"]);
            setCanSell(true);
          })
          .then((resp) => {
            setStatus("Success. Product is now on sale.");
          })
          .catch((err) => {
            setStatus(
              "Something went wrong. Are you connected to Rinkeby network?"
            );
            setCanSell(true);
          });
      }
    };
    if (formPage === formPageArray[2]) {
      return (
        <>
          <div className="inputform">
            <button
              onClick={() => setFormPage(formPageArray[0])}
              className="closeButton"
            >
              Close [X]
            </button>
            <form>
              <label htmlFor="idForm">Product Id:</label>
              <input type="number" placeholder="Product id" id="idForm" />
              <label htmlFor="floorForm">Floor Price (eth):</label>
              <input
                type="number"
                placeholder="Minimum bid amount"
                id="floorForm"
              />
              <label htmlFor="dateForm">Bid Closing Date:</label>
              <input type="date" id="dateForm" />
              <label htmlFor="timeForm">Bid Closing Time:</label>
              <input type="time" id="timeForm" />
            </form>
            {canSell && <button onClick={() => sell()}>Sell Product</button>}
            <h2 style={{ color: "white" }}>{status}</h2>
          </div>
        </>
      );
    } else {
      return <></>;
    }
  };

  const checkAvailability = (launchDate) => {
    let nowDate = new Date();
    let nowDateUnix = convertToUnix(nowDate, "");
    if (nowDateUnix > launchDate) {
      return false;
    } else {
      return true;
    }
  };
  const BidProduct = () => {
    // product data

    const itemObject = {
      name: "",
      id: 1,
      description: "",
      quantity: 0,
      availability: false,
      Owner: "",
      floorPrice: 0,
      launchTime: new Date(6654665655656).toDateString(),
      launchTimetime: 0,
    };
    const reducer = (state, action) => {
      switch (action.type) {
        case "change":
          return { ...action.payload.productData };
      }
    };
    const [state, dispatch] = useReducer(reducer, { ...itemObject });
    const [hasData, setHasData] = useState(true);
    const [status, setStatus] = useState("");
    const [canBid, setCanBid] = useState(true);
    useEffect(() => {
      if (bidProductId > 0 && formPage === formPageArray[3]) {
        performSearch();
      }
    }, [bidProductId]);
    const performSearch = () => {
      setStatus("Getting Product Data...");
      setHasData(false);
      let tempObject = {};
      let searchQuery = bidProductId;
      if (searchQuery <= 0) {
        setStatus("Product data not found.");
        return;
      }
      myContract.methods
        .getProductData(searchQuery)
        .call()
        .then((resp) => {
          if (resp[0] === "") {
            setStatus("Product not found.");
            return;
          }
          tempObject["name"] = resp[0];
          tempObject["description"] = resp[1];
          tempObject["quantity"] = resp[2];
          tempObject["Owner"] = resp[3];
          myContract.methods
            .getProductSaleData(searchQuery)
            .call()
            .then((resp) => {
              tempObject["availability"] = resp[0];
              tempObject["floorPrice"] = parseInt(resp[1]) / 10 ** 18;
              let launchDate = new Date(resp[2] * 1000);
              tempObject["launchTime"] = launchDate.toLocaleDateString();
              tempObject["launchTimetime"] = launchDate.toLocaleTimeString();
              tempObject["id"] = searchQuery;
              let nowDate = new Date();
              let nowDateUnix = convertToUnix(nowDate, "");
              if (nowDateUnix > resp[2]) {
                tempObject["availability"] = false;
              }
              dispatch({
                type: "change",
                payload: { productData: tempObject },
              });
              setHasData(true);
              setStatus("");
            })
            .catch((err) =>
              setStatus("Something went wrong. Maybe try again?")
            );
        })
        .catch((err) =>
          setStatus(
            "Something went wrong. Are you connected to Rinkeby network?"
          )
        );
    };

    const ProductData = () => {
      return (
        <>
          {hasData && (
            <div>
              <h3 style={{ color: "white" }}>{state.name}</h3>
              <h4 style={{ color: "white" }}>{state.description}</h4>
              <h4 style={{ color: "white" }}>Product Id: {state.id}</h4>
              <h4 style={{ color: "white" }}>Quantity: {state.quantity}</h4>
              <h4 style={{ color: "white" }}>Seller: {state.Owner}</h4>
              <h4 style={{ color: "white" }}>
                {state.availability ? "Available" : "Not for Sale"}
              </h4>
              {state.availability ? (
                <>
                  <h4 style={{ color: "white" }}>
                    Minimum Price: {state.floorPrice}
                    eth
                  </h4>
                  <h4 style={{ color: "white" }}>
                    Last Date: {state.launchTime} {state.launchTimetime}
                  </h4>
                </>
              ) : (
                ""
              )}
            </div>
          )}
        </>
      );
    };

    //Bid data

    const bid = async () => {
      setCanBid(false);
      setStatus("Creating bid...");
      let productId = bidProductId;
      let bidAmount = (
        document.getElementById("bidForm").value *
        10 ** 18
      ).toString();

      if (productId <= 0 || bidAmount <= 0) {
        setStatus("Data incomplete.");
        setCanBid(true);
      } else if (document.getElementById("bidForm").value < state.floorPrice) {
        setStatus(
          "Bid amount should be greater than " + state.floorPrice + " eth."
        );
        setCanBid(true);
      } else {
        setStatus("Waiting for transaction...");
        myContract.methods
          .placeBid(productId)
          .send({ from: account, value: bidAmount })
          .on("error", (error) => {
            setStatus(error["message"]);
            setCanBid(true);
          })
          .then((resp) => {
            setStatus("Success. Bid placed successfully.");
          })
          .catch((err) => {
            setStatus(
              "Something went wrong. Are you connected to Rinkeby network?"
            );
            setCanBid(true);
          });
      }
    };
    if (formPage === formPageArray[3]) {
      return (
        <>
          <div className="inputform">
            <ProductData />
            <button
              onClick={() => setFormPage(formPageArray[0])}
              className="closeButton"
            >
              Close [X]
            </button>
            <form>
              <label htmlFor="bidForm">Bid amount (eth):</label>
              <input type="number" placeholder="Bid amount" id="bidForm" />
            </form>
            {canBid && hasData && state.availability && (
              <button onClick={() => bid()}>Place Bid</button>
            )}
            <h2 style={{ color: "white" }}>{status}</h2>
          </div>
        </>
      );
    } else {
      return <></>;
    }
  };
  const CloseBid = () => {
    // product data

    const itemObject = {
      name: "",
      id: 1,
      description: "",
      quantity: 0,
      availability: false,
      Owner: "",
      floorPrice: 0,
      launchTime: new Date(6654665655656).toDateString(),
      launchTimetime: 0,
    };
    const reducer = (state, action) => {
      switch (action.type) {
        case "change":
          return { ...action.payload.productData };
      }
    };
    const [state, dispatch] = useReducer(reducer, { ...itemObject });
    const [hasData, setHasData] = useState(true);
    const [status, setStatus] = useState("");
    useEffect(() => {
      if (closeBidProductId > 0 && formPage === formPageArray[4]) {
        performSearch();
      }
    }, [closeBidProductId]);
    const performSearch = () => {
      setStatus("Getting Product Data...");
      setHasData(false);
      let tempObject = {};
      let searchQuery = closeBidProductId;
      if (searchQuery <= 0) {
        setStatus("Product data not found.");
        return;
      }
      myContract.methods
        .getProductData(searchQuery)
        .call()
        .then((resp) => {
          if (resp[0] === "") {
            setStatus("Product not found.");
            return;
          }
          tempObject["name"] = resp[0];
          tempObject["description"] = resp[1];
          tempObject["quantity"] = resp[2];
          tempObject["Owner"] = resp[3];
          myContract.methods
            .getProductSaleData(searchQuery)
            .call()
            .then((resp) => {
              tempObject["availability"] = resp[0];
              tempObject["floorPrice"] = parseInt(resp[1]) / 10 ** 18;
              let launchDate = new Date(resp[2] * 1000);
              tempObject["launchTime"] = launchDate.toLocaleDateString();
              tempObject["launchTimetime"] = launchDate.toLocaleTimeString();
              tempObject["id"] = searchQuery;
              let nowDate = new Date();
              let nowDateUnix = convertToUnix(nowDate, "");
              if (nowDateUnix > resp[2]) {
                tempObject["availability"] = false;
              }
              dispatch({
                type: "change",
                payload: { productData: tempObject },
              });
              setHasData(true);
              setStatus("");
            })
            .catch((err) =>
              setStatus("Something went wrong. Maybe try again?")
            );
        })
        .catch((err) =>
          setStatus(
            "Something went wrong. Are you connected to Rinkeby network?"
          )
        );
    };

    const ProductData = () => {
      return (
        <>
          {hasData && (
            <div>
              <h3 style={{ color: "white" }}>{state.name}</h3>
              <h4 style={{ color: "white" }}>{state.description}</h4>
              <h4 style={{ color: "white" }}>Product Id: {state.id}</h4>
              <h4 style={{ color: "white" }}>Quantity: {state.quantity}</h4>
              <h4 style={{ color: "white" }}>Seller: {state.Owner}</h4>
              <h4 style={{ color: "white" }}>
                {state.availability ? "Available" : "Not for Sale"}
              </h4>
              {state.availability ? (
                <>
                  <h4 style={{ color: "white" }}>
                    Minimum Price: {state.floorPrice}
                    eth
                  </h4>
                  <h4 style={{ color: "white" }}>
                    Last Date: {state.launchTime} {state.launchTimetime}
                  </h4>
                </>
              ) : (
                ""
              )}
            </div>
          )}
        </>
      );
    };

    //Bid data

    const closebid = async () => {
      setStatus("Creating bid...");
      let productId = closeBidProductId;
      setStatus("Waiting for transaction...");
      myContract.methods
        .closeBid(productId)
        .send({ from: account })
        .on("error", (error) => {
          setStatus(error["message"]);
          setCanBid(true);
        })
        .then((resp) => {
          setStatus("Success. Bid closed.");
        })
        .catch((err) => {
          setStatus(
            "Something went wrong. Are you connected to Rinkeby network?"
          );
          setCanBid(true);
        });
    };
    if (formPage === formPageArray[4]) {
      return (
        <>
          <div className="inputform">
            <ProductData />
            <button
              onClick={() => setFormPage(formPageArray[0])}
              className="closeButton"
            >
              Close [X]
            </button>
            {hasData && !state.availability && state.Owner === account && (
              <button onClick={() => closebid()}>Close Bid</button>
            )}
            <h2 style={{ color: "white" }}>{status}</h2>
          </div>
        </>
      );
    } else {
      return <></>;
    }
  };

  const SellerFunctions = () => {
    return (
      <>
        <div className="sellerFunctionPage">
          <h1>Join the Crypto Market</h1>
          <div className="sellerFunctions">
            <div className="sellerfunction">
              <h2>Create a Product</h2>
              <button onClick={() => setFormPage(formPageArray[1])}>
                Create
              </button>
            </div>
            <div className="sellerfunction">
              <h2>Sell your Product</h2>
              <button onClick={() => setFormPage(formPageArray[2])}>
                Sell
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  const SearchProduct = () => {
    const itemObject = {
      name: "",
      id: 1,
      description: "",
      quantity: 0,
      availability: false,
      Owner: "",
      floorPrice: 0,
      launchTime: new Date(6654665655656).toDateString(),
      launchTimetime: 0,
    };
    const reducer = (state, action) => {
      switch (action.type) {
        case "change":
          return { ...action.payload.productData };
      }
    };
    const [state, dispatch] = useReducer(reducer, { ...itemObject });
    const [hasData, setHasData] = useState(false);
    const [status, setStatus] = useState("");
    const performSearch = () => {
      setHasData(false);
      setStatus("Searching...");
      let tempObject = { ...itemObject };
      let searchQuery = document.getElementById("SearchBar").value;
      if (searchQuery <= 0) {
        setStatus("Please enter a valid product Id.");
        return;
      }
      myContract.methods
        .getProductData(searchQuery)
        .call()
        .then((resp) => {
          if (resp[0] === "") {
            setStatus("Product not found.");
            return;
          }
          tempObject["name"] = resp[0];
          tempObject["description"] = resp[1];
          tempObject["quantity"] = resp[2];
          tempObject["Owner"] = resp[3];
          myContract.methods
            .getProductSaleData(searchQuery)
            .call()
            .then((resp) => {
              tempObject["availability"] = resp[0];
              tempObject["floorPrice"] = parseInt(resp[1]) / 10 ** 18;
              let launchDate = new Date(resp[2] * 1000);
              tempObject["launchTime"] = launchDate.toLocaleDateString();
              tempObject["launchTimetime"] = launchDate.toLocaleTimeString();
              tempObject["id"] = searchQuery;
              let nowDate = new Date();
              let nowDateUnix = convertToUnix(nowDate, "");
              if (nowDateUnix > resp[2]) {
                tempObject["availability"] = false;
              }
              dispatch({
                type: "change",
                payload: { productData: tempObject },
              });
              setHasData(true);
              setStatus("");
            })
            .catch((err) =>
              setStatus("Something went wrong. Maybe try again?")
            );
        })
        .catch((err) =>
          setStatus(
            "Something went wrong. Are you connected to Rinkeby network?"
          )
        );
    };
    return (
      <>
        <div className="SearchBar">
          <h2>Search for products</h2>
          <input type="number" placeholder="Enter product Id" id="SearchBar" />
          <button onClick={() => performSearch()}>Search</button>
          <h4>{status}</h4>
          {hasData && (
            <div>
              <h3>{state.name}</h3>
              <h4>{state.description}</h4>
              <h4>Product Id: {state.id}</h4>
              <h4>Quantity: {state.quantity}</h4>
              <h4>Seller: {state.Owner}</h4>
              <h4>{state.availability ? "Available" : "Not for Sale"}</h4>
              {state.availability ? (
                <>
                  <h4>
                    Minimum Price: {state.floorPrice}
                    eth
                  </h4>
                  <h4>
                    Last Date: {state.launchTime} {state.launchTimetime}
                  </h4>
                  <button
                    onClick={() => {
                      setFormPage(formPageArray[3]);
                      setBidProductId(state.id);
                    }}
                  >
                    Bid
                  </button>
                </>
              ) : (
                ""
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  const ConnectButton = () => {
    return (
      <>
        <div className="connectButton">
          <button
            onClick={() => {
              if (isConnected) {
                deactivate();
              } else {
                activateBrowserWallet();
              }
            }}
          >
            {isConnected ? "Disconnect" : "Connect"}
          </button>
        </div>
      </>
    );
  };

  const TitleComp = () => {
    return (
      <>
        <div
          className="titleSection"
          style={isConnected ? {} : { height: "100vh" }}
        >
          <div
            style={{
              fontSize: "50px",
              lineHeight: "50px",
              padding: "50px 0px",
            }}
          >
            Crypto Market
          </div>
          <div style={{ fontSize: "15px", lineHeight: "15px" }}>
            0xcfb0a5cd7615dae7781a31d09055eb4b09e2218f <p>TestNet Rinkeby</p>
          </div>
          {isConnected ? (
            ""
          ) : (
            <>
              <button
                onClick={() => {
                  if (isConnected) {
                    deactivate();
                  } else {
                    activateBrowserWallet();
                  }
                }}
              >
                Connect Wallet
              </button>
            </>
          )}
        </div>
      </>
    );
  };
  return (
    <>
      <ConnectButton />
      <TitleComp />
      {isConnected ? (
        <>
          <SearchProduct />
          <SellerFunctions />
          <CreateProduct />
          <SellProduct />
          <BidProduct />
          <CloseBid />
          <ProductData />
        </>
      ) : (
        <></>
      )}
    </>
  );
}

// export async function getStaticProps() {
//   const jsonInterFace = await import("../MarketPlace.json");
//   return { props: { jsonInterFace: jsonInterFace.default } };
// }
