import React, { useEffect, useState } from 'react';
import * as fcl from "@onflow/fcl";
import * as FlowTypes from '@onflow/types';
import { coreService } from './core/service';
import { Signer } from './core/signer';
import { uuid } from 'uuidv4';

function App() {
  const [user, setUser] = useState({loggedIn: null})
  const [balance, setBalance] = useState('');
  const [hasCollection, setHasCollection] = useState(false);
  const [stateForm, setStateForm] = useState({
    name: '',
    state: ''
  })
  const [spriteIDs, setSpriteIDs] = useState([])
  const [metaDatas, setMetaDatas] = useState([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [reloadInit, setReloadInit] = useState(false)
  const [lastName, setLastName] = useState('')
  const config = coreService.getConfig();
  const serviceWallet = config.serviceWallet
  let signer = new Signer(serviceWallet, true);

  useEffect(() => fcl.currentUser.subscribe(setUser), [])

  useEffect(() => {
    if (!user?.addr) {
      return;
    }

    init();
  }, [user])

  useEffect(() => {
    if (!reloadInit) {
      return;
    }

    init();
  }, [reloadInit])

  const init = () => {
    if (!user?.loggedIn) {
      return;
    }
    // fetch balance
    fetchBalance(user?.addr);
    checkCollection(user?.addr);
  }

  useEffect(() => {
    if (hasCollection) {
      getSpriteIDs(user?.addr);
    }
  }, [hasCollection])

  useEffect(() => {
    if (!isSubmitted) {
      return;
    }
    getSpriteIDs(serviceWallet?.address);
  }, [isSubmitted])

  useEffect( async () => {
    if (spriteIDs.length === 0) {
      return;
    }

    let metaDataResults = []
    for (let i = 0; i < spriteIDs.length; i += 1) {
      const metaData = await fetchMetaData(spriteIDs[i], isSubmitted ? serviceWallet?.address : user?.addr)
      const result = {
        ...metaData,
        id: spriteIDs[i]
      }
      metaDataResults.push(result);
    }

    setMetaDatas(metaDataResults);
    // eslint-disable-next-line
  }, [spriteIDs])

  useEffect(async () => {
    if (!isSubmitted) {
      return;
    }

    const lastNameRecord = metaDatas.find((metadata) => metadata.name === lastName);
    if (typeof lastNameRecord === undefined) {
      return;
    }
    const result = await transfer(user?.addr, lastNameRecord?.id);
    console.log(result, 'result')
    if (result?.statusCode === 0) { // means successful
      setLastName('');
      setIsSubmitted(false);
      setReloadInit(true);
      console.log('meow')
    }
    // eslint-disable-next-line
  }, [metaDatas])

  const fetchMetaData = async (id, address) => {
    const metaData = await fcl.send([
      fcl.script`
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868
        import CryptoChumSprite from ${config.smartContractAddress}

        pub fun main(address: Address, id: UInt64): {String : String} {
          let collectionRef = getAccount(address)
            .getCapability(/public/cryptoChumSpriteCollection)
            .borrow<&{CryptoChumSprite.Receiver}>()
            ?? panic("Could not borrow collection reference")

          // Borrow a reference to a specific NFT in the collection
          let metadata = collectionRef.getMetadata(id: id)

          return metadata!
        }
      `,
      fcl.args([
        fcl.arg(address, FlowTypes.Address),
        fcl.arg(parseInt(id), FlowTypes.UInt64)
      ])
    ]).then(fcl.decode);

    return metaData;
  }

  const getSpriteIDs = async (address) => {
    const spriteIDs = await fcl.send([
      fcl.script`
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868
        import CryptoChumSprite from ${config.smartContractAddress}

        pub fun main(address: Address): [UInt64] {
          let collectionRef = getAccount(address)
            .getCapability(/public/cryptoChumSpriteCollection)
            .borrow<&{CryptoChumSprite.Receiver}>()
            ?? panic("Could not borrow collection reference")

          // Borrow a reference to a specific NFT in the collection
          let sprites = collectionRef.getIDs()

          return sprites
        }
      `,
      fcl.args([
        fcl.arg(address, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    setSpriteIDs(spriteIDs);
  }

  const fetchBalance = async (address) => {
    const balance = await fcl.send([
      fcl.script`
        import FungibleToken from 0x9a0766d93b6608b7
        import FlowToken from 0x7e60df042a9c0868

        pub fun main(address: Address): UFix64 {
          let vaultRef = getAccount(address)
            .getCapability(/public/flowTokenBalance)
            .borrow<&FlowToken.Vault{FungibleToken.Balance}>()
            ?? panic("Could not borrow Balance reference to the Vault");

          return vaultRef.balance;
        }
      `,
      fcl.args([
        fcl.arg(address, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    setBalance(balance);
  }

  const checkCollection = async (address) => {
    setHasCollection(false);
    const hasCollection = await fcl.send([
      fcl.script`
        import CryptoChumSprite from ${config.smartContractAddress}

        pub fun main(address: Address): Bool {
          let collectionRef = getAccount(address)
            .getCapability(/public/cryptoChumSpriteCollection)
            .borrow<&{CryptoChumSprite.Receiver}>()

          return collectionRef != nil ? true : false
        }
      `,
      fcl.args([
        fcl.arg(address, FlowTypes.Address)
      ])
    ]).then(fcl.decode);

    setHasCollection(hasCollection);
  }

  const onCreateCollection = async () => {
    const transactionId = await fcl.send([
      fcl.transaction`
        import CryptoChumSprite from ${config.smartContractAddress}

        transaction() {
          prepare(account: AuthAccount) {
            if account.borrow<&CryptoChumSprite.Collection>(from: /storage/cryptoChumSpriteCollection) != nil {
                return
            }
            let collection <- CryptoChumSprite.createCollection()

            account.save(
                <- collection,
                to: /storage/cryptoChumSpriteCollection
            )
    
            account.link<&{CryptoChumSprite.Receiver}>(
                /public/cryptoChumSpriteCollection,
                target: /storage/cryptoChumSpriteCollection
            )

            let collectionRef = account.getCapability(/public/cryptoChumSpriteCollection)
            .borrow<&{CryptoChumSprite.Receiver}>()
          }

          execute {
          }
        }
      `,
      fcl.args([]),
      fcl.payer(fcl.authz),
      fcl.proposer(fcl.authz),
      fcl.authorizations([fcl.authz]),
      fcl.limit(300)
    ]).then(fcl.decode);

    const result = await fcl.tx(transactionId).onceSealed();
    console.log(result, 'result')
    if (result.statusCode === 0) {
      setReloadInit(true)
    }
    setIsSubmitted(true);
  }

  const storeCryptoChumSpriteState =
    async (name, state, address) => {
      try {
        const transactionId = await fcl.send([
          fcl.transaction`
            import CryptoChumSprite from ${config.smartContractAddress}
  
            transaction(name: String, state: String, address: Address) {
              
              let sprite: @CryptoChumSprite.NFT?
              let collectionRef: &{CryptoChumSprite.Receiver}
  
              prepare(account: AuthAccount) {
                let minterRef = account.borrow<&CryptoChumSprite.Minter>(from: /storage/cryptoChumSpriteMinter)
                  ?? panic("Couldn't borrow minter reference.")
                  
                self.sprite <- minterRef.mint(
                  name: name,
                  state: state
                )
                self.collectionRef = account
                  .getCapability<&{CryptoChumSprite.Receiver}>(/public/cryptoChumSpriteCollection)
                  .borrow()
                  ?? panic("Couldn't borrow receiver reference.")
              }
              execute {
                if self.sprite == nil {
                  destroy self.sprite
                } else {
                  let metadata : {String : String} = {
                    "name": name,
                    "state": state
                  }
                  self.collectionRef.deposit(sprite: <- self.sprite!, metadata: metadata)
                }
              }
            }
          `,
          fcl.args([
            fcl.arg(name, FlowTypes.String),
            fcl.arg(state, FlowTypes.String),
            fcl.arg(address, FlowTypes.Address)
          ]),
          fcl.payer(await signer.authorize({address: serviceWallet?.address})),
          fcl.proposer(await signer.authorize({address: serviceWallet?.address})),
          fcl.authorizations([await signer.authorize({address: serviceWallet?.address})]),
          fcl.limit(300)
        ]).then(fcl.decode);
        
        return fcl.tx(transactionId).onceSealed();
      } catch (error) {
        console.log(error)
      }
    };

  const transfer = async (receiverAddr, spriteID) => {
    try {
      const transactionId = await fcl.send([
        fcl.transaction`
          import CryptoChumSprite from ${config.smartContractAddress}

          transaction(receiverAddr: Address, spriteID: UInt64) {

            prepare(acct: AuthAccount) {
        
                // get the recipients public account object
                let recipient = getAccount(receiverAddr)
        
                // borrow a reference to the signer's NFT collection
                let collectionRef = acct.borrow<&CryptoChumSprite.Collection>(from: /storage/cryptoChumSpriteCollection)
                    ?? panic("Could not borrow a reference to the owner's collection")
        
                // borrow a public reference to the receivers collection
                let depositRef = recipient.getCapability(/public/cryptoChumSpriteCollection)
                    .borrow<&{CryptoChumSprite.Receiver}>()
                    ?? panic("Could not borrow a reference to the receiver's collection")
        
                // withdraw the NFT from the owner's collection
                let sprite <- collectionRef.withdraw(spriteID: spriteID)
        
                // Deposit the NFT in the recipient's collection
                let metadata : {String : String} = {
                  "name": sprite.name,
                  "state": sprite.state
                }
                depositRef.deposit(sprite: <-sprite!, metadata: metadata)
            }
        }
        `,
        fcl.args([
          fcl.arg(receiverAddr, FlowTypes.Address),
          fcl.arg(parseInt(spriteID), FlowTypes.UInt64)
        ]),
        fcl.payer(await signer.authorize({address: serviceWallet?.address})),
        fcl.proposer(await signer.authorize({address: serviceWallet?.address})),
        fcl.authorizations([await signer.authorize({address: serviceWallet?.address})]),
        fcl.limit(300)
      ]).then(fcl.decode);
      
      return fcl.tx(transactionId).onceSealed();
    } catch (error) {
      console.log(error)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const uniqueId = uuid();
    const result = await storeCryptoChumSpriteState(uniqueId, stateForm.state, serviceWallet?.address)
    if (result?.statusCode === 0) { // means successful
    setLastName(uniqueId);
    setIsSubmitted(true);
    }
  }

  const AuthedState = () => {
    return (
      <div>
        <div>Address: {user?.addr ?? "No Address"}</div>
        <div>Balance: {balance}</div>
        <div>has collection: {hasCollection ? 'yes': 'no'}</div>
        <div>
          {!hasCollection ? 
            <button type="button" onClick={onCreateCollection}>Create Collection</button> : null
          }
        </div>
        <div>
          {/* <input 
          type="text"
          placeholder={'Description'}
          value={stateForm.name} onChange={(e) => {
            e.preventDefault()
            setStateForm({
              ...stateForm,
              name: e.target.value
            })
          }}
          /> */}
          <input 
          type="text"
          placeholder={'State'}
          value={stateForm.state} onChange={(e) => {
            e.preventDefault()
            setStateForm({
              ...stateForm,
              state: e.target.value
            })
          }}
          />
          <button type="button" onClick={onSubmit}>Submit</button>
        </div>
        <div>
          <table>
            <thead>
              <tr>
                <th>Desciption</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {metaDatas?.length > 0 && lastName === '' ?
                metaDatas.map((data, i) => (
                    <tr key={i}>
                      <td>{data?.name}</td>
                      <td>{data?.state}</td>
                    </tr>
                )) : null
              }
            </tbody>
          </table>
        </div>
        <button onClick={fcl.unauthenticate}>Log Out</button>
      </div>
    )
  }

  const UnauthenticatedState = () => {
    return (
      <div>
        <button onClick={fcl.logIn}>Log In</button>
        <button onClick={fcl.signUp}>Sign Up</button>
      </div>
    )
  }

  return (
    <div>
      <h1>Flow App</h1>
      {user?.loggedIn
        ? <AuthedState />
        : <UnauthenticatedState />
      }
    </div>
  );
}

export default App;
