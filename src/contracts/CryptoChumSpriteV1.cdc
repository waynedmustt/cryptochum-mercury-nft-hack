pub contract CryptoChumSpriteV1 {
    
    pub resource NFT {
        pub let id: UInt64
        pub var uniqueId: String
        pub let name: String
        pub let state: String

        init(id: UInt64, uniqueId: String, name: String, state: String) {
            self.id = id
            self.uniqueId = uniqueId
            self.name = name
            self.state = state
        }
    }

    pub resource interface Receiver {
        pub fun deposit(sprite: @NFT, metadata: {String : String})
        pub fun getIDs(): [UInt64]
        pub fun getMetadata(id: UInt64) : {String : String}
    }

    pub resource Collection: Receiver {
        pub let sprites: @{UInt64: NFT}
        pub let metadataObjs: {UInt64: { String : String }}

        init() {
            self.sprites <- {}
            self.metadataObjs = {}
        }

        destroy() {
            destroy self.sprites
        }

        pub fun withdraw(spriteID: UInt64): @NFT {
            let sprite <- self.sprites.remove(key: spriteID)!

            return <- sprite
        }

        pub fun deposit(sprite: @NFT, metadata: {String : String}) {
            self.metadataObjs[sprite.id] = metadata 
            self.sprites[sprite.id] <-! sprite
        }

        pub fun getIDs(): [UInt64] {
            return self.sprites.keys
        }

        pub fun getMetadata(id: UInt64): {String : String} {
            // return self.sprites[id]?.metadata!
             // let sprite <- self.sprites[id]!
            // return sprite.metadata
            return self.metadataObjs[id]!
        }
    }

    pub resource Minter {
        pub var totalSupply: UInt64

        init() {
            self.totalSupply = 0
        }
        pub fun mint(uniqueId: String, name: String, state: String): @NFT {
            let nft <- create NFT(id: self.totalSupply + 1, uniqueId: uniqueId, name: name, state: state)
            self.totalSupply = self.totalSupply + 1
            return <- nft
        }
    }

    pub fun createCollection(): @Collection {
        return <- create Collection()
    }

    init() {
        self.account.save(
            <- create Minter(),
            to: /storage/cryptoChumSpriteMinterV1
        )

        self.account.link<&Minter>(
            /public/cryptoChumSpriteMinterV1,
            target: /storage/cryptoChumSpriteMinterV1
        )
    }
}